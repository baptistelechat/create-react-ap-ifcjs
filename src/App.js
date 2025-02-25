// REACT
import React, { useEffect, useRef, useState, useContext } from "react";
// MATERIAL UI
import Slide from "@mui/material/Slide";
import Typography from "@mui/material/Typography";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { createTheme, ThemeProvider } from "@mui/material/styles";
// COLORS
import { blue, red } from "@mui/material/colors";
// THREE.js
import THREE from "./utils/three/three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import {
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCBEAM,
  IFCCOLUMN,
  IFCFOOTING,
} from "web-ifc";

import { HorizontalBlurShader } from "./utils/three/shaders/HorizontalBlurShader";
import { VerticalBlurShader } from "./utils/three/shaders/VerticalBlurShader";
// COMPONENTS
import LoadFile from "./components/LoadFile.jsx";
import Settings from "./components/Settings/Settings.jsx";
import Authentication from "./components/Authentication/Authentication";
// OTHER
import { SnackbarProvider } from "notistack";
import { Toaster } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
// REDUX
import { useSelector } from "react-redux";
// STYLES
import "./App.css";
// FIREBASE
import { FirebaseContext } from "./utils/firebase/firebaseContext";

const App = () => {
  const loaderRef = useRef();

  const [IFCview, setIFCview] = useState(null);
  const [gridVisibility, setGridVisibility] = useState(true);

  const { currentUser, username } = useContext(FirebaseContext);
  const { pathname } = useLocation();

  console.log(IFCview);

  const categories = {
    IFCWALLSTANDARDCASE,
    IFCSLAB,
    IFCBEAM,
    IFCCOLUMN,
    IFCFOOTING,
  };

  // Stores the created subsets
  const subsets = {};

  // Gets the name of a category
  function getName(category) {
    const names = Object.keys(categories);
    return names.find((name) => categories[name] === category);
  }

  async function setupAllCategories(position) {
    const allCategories = Object.values(categories);
    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      await setupCategory(category, position);
    }
  }

  // Creates a new subset and configures the checkbox
  async function setupCategory(category, position) {
    subsets[category] = await newSubsetOfType(category, position);
    // await styleCategory(category, position);
  }

  // Creates a new subset containing all elements of a category
  const newSubsetOfType = async (category, position) => {
    const ids = await getAll(category);
    if (loaderRef.current && ifcModels[0] !== undefined) {
      const ifcClasseName = getName(category);
      const material = new THREE.MeshLambertMaterial({
        transparent: true,
        opacity: 1,
        // color:
        //   ifcClasseName === "IFCWALLSTANDARDCASE"
        //     ? 0x1565c0
        //     : ifcClasseName === "IFCSLAB"
        //     ? 0xf55442
        //     : ifcClasseName === "IFCCOLUMN"
        //     ? 0xf5f542
        //     : ifcClasseName === "IFCBEAM"
        //     ? 0x42f554
        //     : ifcClasseName === "IFCFOOTING"
        //     ? 0x7143f0
        //     : 0x000000,
        color:
          ifcClasseName === "IFCWALLSTANDARDCASE"
            ? 0xbdbdbd
            : ifcClasseName === "IFCSLAB"
            ? 0x757575
            : ifcClasseName === "IFCCOLUMN"
            ? 0xbdbdbd
            : ifcClasseName === "IFCBEAM"
            ? 0xbdbdbd
            : ifcClasseName === "IFCFOOTING"
            ? 0x424242
            : 0x000000,
        depthTest: true,
      });

      if (ids !== []) {
        const subset = loaderRef.current.ifcManager.createSubset({
          modelID: 0,
          scene: IFCview,
          ids,
          removePrevious: true,
          customID: category.toString(),
          material,
        });

        subset.translateX(position[0]);
        subset.translateY(position[1]);
        subset.translateZ(position[2]);

        subset.name = ifcClasseName;

        return subset;
      }
    }
  };

  // Gets the IDs of all the items of a specific category
  const getAll = async (category) => {
    if (loaderRef.current && ifcModels[0] !== undefined) {
      const manager = loaderRef.current.ifcManager;
      return manager.getAllItemsOfType(0, category, false);
    }
  };

  const isMobile =
    "ontouchstart" in document.documentElement &&
    navigator.userAgent.match(/Mobi/);

  const openLink = (url) => {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  };

  const customTheme = createTheme({
    palette: {
      type: "light",
      primary: {
        main:
          username === "123structure" || pathname.includes("123structure")
            ? "#ffcc00"
            : blue[800],
        light:
          username === "123structure" || pathname.includes("123structure")
            ? "#fffae6"
            : blue[50],
      },
      secondary: {
        main:
          username === "123structure" || pathname.includes("123structure")
            ? "#f28e1c"
            : red[800],
      },
    },
  });

  const ifcModels = useSelector((state) => state.ifcModels.value);
  const ifcModelsName = useSelector((state) => state.ifcModels.name);

  useEffect(() => {
    console.log(ifcModels);
    if (ifcModels[0] !== undefined) {
      var box = new THREE.Box3().setFromObject(ifcModels[0]);
      const x =
        ((box.max.x < 0 ? box.max.x * -1 : box.max.x) +
          (box.min.x < 0 ? box.min.x * -1 : box.min.x)) /
          2 -
        box.max.x;
      const y = box.min.y < 0 ? box.min.y * -1 : box.min.y;
      const z =
        ((box.max.z < 0 ? box.max.z * -1 : box.max.z) +
          (box.min.z < 0 ? box.min.z * -1 : box.min.z)) /
          2 -
        box.max.z;

      ifcModels[0].translateX(x);
      ifcModels[0].translateY(y);
      ifcModels[0].translateZ(z);

      console.log();
      setupAllCategories([x, y, z]);
    }
  }, [ifcModels]);

  //Creates the Three.js scene
  useEffect(() => {
    let camera, scene, renderer;

    // const meshes = [];

    const PLANE_WIDTH = 200;
    const PLANE_HEIGHT = 200;
    const CAMERA_HEIGHT = 12;

    const state = {
      shadow: {
        blur: 1.5,
        darkness: 2,
        opacity: 1,
      },
      plane: {
        color: "#ffff00",
        opacity: 0,
      },
    };

    let shadowGroup,
      renderTarget,
      renderTargetBlur,
      shadowCamera,
      cameraHelper,
      depthMaterial,
      horizontalBlurMaterial,
      verticalBlurMaterial;

    let plane, blurPlane, fillPlane;

    init();
    animate();

    function init() {
      //Object to store the size of the viewport
      const size = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      //Creates the camera (point of view of the user)
      const aspect = size.width / size.height;
      camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      camera.position.z = 15;
      camera.position.y = 13;
      camera.position.x = 8;

      scene = new THREE.Scene();
      setIFCview(scene);
      scene.background = new THREE.Color(0xffffff);

      //Creates the lights of the scene
      const lightColor = 0xffffff;

      const ambientLight = new THREE.AmbientLight(lightColor, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(lightColor, 1);
      directionalLight.position.set(0, 10, 0);
      directionalLight.target.position.set(-5, 0, 0);
      scene.add(directionalLight);
      scene.add(directionalLight.target);

      // Sets up the IFC loading
      loaderRef.current = new IFCLoader();
      loaderRef.current.ifcManager.useWebWorkers(true, "../../IFCWorker.js");
      loaderRef.current.ifcManager.setWasmPath("../../");
      loaderRef.current.ifcManager.applyWebIfcConfig({
        COORDINATE_TO_ORIGIN: true,
        USE_FAST_BOOLS: false,
      });

      // Sets up optimized picking
      loaderRef.current.ifcManager.setupThreeMeshBVH(
        computeBoundsTree,
        disposeBoundsTree,
        acceleratedRaycast
      );

      window.addEventListener("resize", onWindowResize);

      // add the example meshes

      // const geometries = [
      //   new THREE.BoxGeometry(0.4, 0.4, 0.4),
      //   new THREE.IcosahedronGeometry(0.3),
      //   new THREE.TorusKnotGeometry(0.4, 0.05, 256, 24, 1, 3),
      // ];

      // const material = new THREE.MeshNormalMaterial();

      // for (let i = 0, l = geometries.length; i < l; i++) {
      //   const angle = (i / l) * Math.PI * 2;

      //   const geometry = geometries[i];
      //   const mesh = new THREE.Mesh(geometry, material);
      //   mesh.position.y = 0.1;
      //   mesh.position.x = Math.cos(angle) / 2.0;
      //   mesh.position.z = Math.sin(angle) / 2.0;
      //   scene.add(mesh);
      //   meshes.push(mesh);
      // }

      //Creates grids and axes in the scene
      const grid = new THREE.GridHelper(100, 20);
      scene.add(grid);

      const axes = new THREE.AxesHelper();
      axes.material.depthTest = false;
      axes.renderOrder = 1;
      scene.add(axes);

      // the container, if you need to move the plane just move this
      shadowGroup = new THREE.Group();
      shadowGroup.position.y = -0.3;
      scene.add(shadowGroup);

      // the render target that will show the shadows in the plane texture
      renderTarget = new THREE.WebGLRenderTarget(512, 512);
      renderTarget.texture.generateMipmaps = false;

      // the render target that we will use to blur the first render target
      renderTargetBlur = new THREE.WebGLRenderTarget(512, 512);
      renderTargetBlur.texture.generateMipmaps = false;

      // make a plane and make it face up
      const planeGeometry = new THREE.PlaneGeometry(
        PLANE_WIDTH,
        PLANE_HEIGHT
      ).rotateX(Math.PI / 2);
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: renderTarget.texture,
        opacity: state.shadow.opacity,
        transparent: true,
        depthWrite: false,
      });
      plane = new THREE.Mesh(planeGeometry, planeMaterial);
      // make sure it's rendered after the fillPlane
      plane.renderOrder = 1;
      shadowGroup.add(plane);

      // the y from the texture is flipped!
      plane.scale.y = -1;

      // the plane onto which to blur the texture
      blurPlane = new THREE.Mesh(planeGeometry);
      blurPlane.visible = false;
      shadowGroup.add(blurPlane);

      // the plane with the color of the ground
      const fillPlaneMaterial = new THREE.MeshBasicMaterial({
        color: state.plane.color,
        opacity: state.plane.opacity,
        transparent: true,
        depthWrite: false,
      });
      fillPlane = new THREE.Mesh(planeGeometry, fillPlaneMaterial);
      fillPlane.rotateX(Math.PI);
      shadowGroup.add(fillPlane);

      // the camera to render the depth material from
      shadowCamera = new THREE.OrthographicCamera(
        -PLANE_WIDTH / 2,
        PLANE_WIDTH / 2,
        PLANE_HEIGHT / 2,
        -PLANE_HEIGHT / 2,
        0,
        CAMERA_HEIGHT
      );
      shadowCamera.rotation.x = Math.PI / 2; // get the camera to look up
      shadowGroup.add(shadowCamera);

      cameraHelper = new THREE.CameraHelper(shadowCamera);

      // like MeshDepthMaterial, but goes from black to transparent
      depthMaterial = new THREE.MeshDepthMaterial();
      depthMaterial.userData.darkness = { value: state.shadow.darkness };
      depthMaterial.onBeforeCompile = function (shader) {
        shader.uniforms.darkness = depthMaterial.userData.darkness;
        shader.fragmentShader = /* glsl */ `
						uniform float darkness;
						${shader.fragmentShader.replace(
              "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
              "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );"
            )}
					`;
      };

      depthMaterial.depthTest = false;
      depthMaterial.depthWrite = false;

      horizontalBlurMaterial = new THREE.ShaderMaterial(HorizontalBlurShader);
      horizontalBlurMaterial.depthTest = false;

      verticalBlurMaterial = new THREE.ShaderMaterial(VerticalBlurShader);
      verticalBlurMaterial.depthTest = false;

      //Sets up the renderer, fetching the canvas of the HTML

      const threeCanvas = document.getElementById("three-canvas");
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: threeCanvas,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      // document.body.appendChild(renderer.domElement);

      //

      new THREE.OrbitControls(camera, threeCanvas);
    }

    // Listen for window resize
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // renderTarget --> blurPlane (horizontalBlur) --> renderTargetBlur --> blurPlane (verticalBlur) --> renderTarget
    function blurShadow(amount) {
      blurPlane.visible = true;

      // blur horizontally and draw in the renderTargetBlur
      blurPlane.material = horizontalBlurMaterial;
      blurPlane.material.uniforms.tDiffuse.value = renderTarget.texture;
      horizontalBlurMaterial.uniforms.h.value = (amount * 1) / 256;

      renderer.setRenderTarget(renderTargetBlur);
      renderer.render(blurPlane, shadowCamera);

      // blur vertically and draw in the main renderTarget
      blurPlane.material = verticalBlurMaterial;
      blurPlane.material.uniforms.tDiffuse.value = renderTargetBlur.texture;
      verticalBlurMaterial.uniforms.v.value = (amount * 1) / 256;

      renderer.setRenderTarget(renderTarget);
      renderer.render(blurPlane, shadowCamera);

      blurPlane.visible = false;
    }

    function animate() {
      requestAnimationFrame(animate);

      //

      // meshes.forEach((mesh) => {
      //   mesh.rotation.x += 0.01;
      //   mesh.rotation.y += 0.02;
      // });

      //

      // remove the background
      const initialBackground = scene.background;
      scene.background = null;

      // force the depthMaterial to everything
      cameraHelper.visible = false;
      scene.overrideMaterial = depthMaterial;

      // set renderer clear alpha
      const initialClearAlpha = renderer.getClearAlpha();
      renderer.setClearAlpha(0);

      // render to the render target to get the depths
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, shadowCamera);

      // and reset the override material
      scene.overrideMaterial = null;
      cameraHelper.visible = true;

      blurShadow(state.shadow.blur);

      // a second pass to reduce the artifacts
      // (0.4 is the minimum blur amout so that the artifacts are gone)
      blurShadow(state.shadow.blur * 0.4);

      // reset and render the normal scene
      renderer.setRenderTarget(null);
      renderer.setClearAlpha(initialClearAlpha);
      scene.background = initialBackground;

      renderer.render(scene, camera);
    }
  }, []);

  // //Raycaster
  // const raycaster = new THREE.Raycaster();
  // raycaster.firstHitOnly = true;
  // const mouse = new THREE.Vector2();

  // const cast = (event) => {
  //   // Computes the position of the mouse on the screen
  //   const bounds = document
  //     .getElementById("three-canvas")
  //     .getBoundingClientRect();

  //   const x1 = event.clientX - bounds.left;
  //   const x2 = bounds.right - bounds.left;
  //   mouse.x = (x1 / x2) * 2 - 1;

  //   const y1 = event.clientY - bounds.top;
  //   const y2 = bounds.bottom - bounds.top;
  //   mouse.y = -(y1 / y2) * 2 + 1;

  //   // Places it on the camera pointing to the mouse
  //   raycaster.setFromCamera(mouse, cameraRef.current);

  //   // Casts a ray
  //   return raycaster.intersectObjects(ifcModels);
  // };

  // const pick = async (event) => {
  //   const found = cast(event)[0];
  //   if (found) {
  //     const index = found.faceIndex;
  //     const geometry = found.object.geometry;
  //     const ifc = loaderRef.current.ifcManager;
  //     const id = ifc.getExpressId(geometry, index);
  //     const modelID = found.object.modelID;
  //     const props = await ifc.getItemProperties(modelID, id);
  //     console.log(props);
  //     const type = await ifc.getTypeProperties(modelID, id);
  //     console.log(type);
  //     const material = await ifc.getMaterialsProperties(modelID, id);
  //     console.log(material);
  //     const sets = await ifc.getPropertySets(modelID, id);
  //     console.log(sets);
  //     const tree = await ifc.getSpatialStructure(modelID, id);
  //     console.log(tree);
  //   }
  // };

  // Creates subset material
  // const preselectMat = new THREE.MeshLambertMaterial({
  //   transparent: true,
  //   opacity: 0.5,
  //   color: 0x1565c0,
  //   depthTest: true,
  // });

  // const selectMat = new THREE.MeshLambertMaterial({
  //   transparent: true,
  //   opacity: 1,
  //   color: 0x1565c0,
  //   depthTest: true,
  // });

  // // Reference to the previous selection
  // let preselectModel = { id: -1 };

  // const highlight = (event, material, model) => {
  //   const found = cast(event)[0];
  //   if (found) {
  //     // Gets model ID
  //     model.id = found.object.modelID;

  //     // Gets Express ID
  //     const index = found.faceIndex;
  //     const geometry = found.object.geometry;
  //     const ifc = loaderRef.current.ifcManager;
  //     const id = ifc.getExpressId(geometry, index);

  //     // Creates subset
  //     loaderRef.current.ifcManager.createSubset({
  //       modelID: model.id,
  //       ids: [id],
  //       material: material,
  //       scene: IFCview,
  //       removePrevious: true,
  //     });
  //   } else {
  //     // Removes previous highlight
  //     loaderRef.current.ifcManager.removeSubset(model.id, IFCview, material);
  //   }
  // };

  // window.onmousemove = (event) => {
  //   if (isMobile) {
  //     pick(event);
  //     highlight(event, selectMat, selectModel);
  //   } else {
  //     highlight(event, preselectMat, preselectModel);
  //   }
  // };

  // const selectModel = { id: -1 };

  // if (document.getElementById("three-canvas") !== null) {
  //   document.getElementById("three-canvas").ondblclick = (event) => {
  //     pick(event);
  //     highlight(event, selectMat, selectModel);
  //   };
  // }

  function dropHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    document.getElementById("dropZone").style.display = "flex";
  }

  function dragOverHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    document.getElementById("dropZone").style.display = "flex";
  }

  return (
    <ThemeProvider theme={customTheme}>
      <SnackbarProvider
        maxSnack={5}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        TransitionComponent={Slide}
      >
        <Toaster position="bottom-left" reverseOrder={true} />
        <Settings
          IFCview={IFCview}
          loaderRef={loaderRef}
          preselectMat={null}
          selectMat={null}
        />
        {currentUser ? (
          <LoadFile
            IFCview={IFCview}
            loaderRef={loaderRef}
            // preselectMat={preselectMat}
            // selectMat={selectMat}
            preselectMat={null}
            selectMat={null}
          />
        ) : null}
        <Authentication />
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              background:
                username === "123structure" || pathname.includes("123structure")
                  ? "rgb(255,240,185,0.5)"
                  : "rgb(227,242,253,0.5)", // Make sure this color has an opacity of less than 1
              backdropFilter: "blur(4px)", // This be the blur
              borderRadius: "8px",
              padding: "8px",
            }}
            onClick={() => {
              username === "123structure" || pathname.includes("123structure")
                ? openLink("https://www.123structure.fr")
                : console.log("Not available");
            }}
          >
            <img
              src={
                username === "123structure" || pathname.includes("123structure")
                  ? "../assets/123structure.png"
                  : "../assets/icon/house.svg"
              }
              alt="Vision"
              style={{
                height: "64px",
                width: "64px",
              }}
            />
            {isMobile ? null : username === "123structure" ||
              pathname.includes("123structure") ? (
              <Typography
                variant="h5"
                sx={{
                  color:
                    username === "123structure" ||
                    pathname.includes("123structure")
                      ? "#231f20"
                      : blue[800],
                  fontWeight: "bold",
                  fontSize: "1.75rem",
                  marginLeft: "16px",
                  marginRight: "8px",
                  maxWidth: "1200px",
                }}
              >
                Notre site internet
              </Typography>
            ) : (
              <Typography
                variant="h5"
                sx={{
                  color:
                    username === "123structure" ||
                    pathname.includes("123structure")
                      ? "#231f20"
                      : blue[800],
                  fontWeight: "bold",
                  fontSize: "1.75rem",
                  marginLeft: "16px",
                  marginRight: "8px",
                  maxWidth: "1200px",
                }}
              >
                Vision
              </Typography>
            )}
            {username === "123structure" ||
            pathname.includes("123structure") ? (
              <img
                src="../assets/cursor.png"
                alt="cursor"
                style={{
                  height: "50px",
                  width: "50px",
                  marginTop: "8px",
                }}
              />
            ) : null}
          </div>
          {isMobile ? null : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgb(255,255,255,0.5)", // Make sure this color has an opacity of less than 1
                backdropFilter: "blur(4px)", // This be the blur
                borderRadius: "8px",
                padding: "12px",
                marginTop: "8px",
              }}
            >
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      color={
                        username === "123structure" ||
                        pathname.includes("123structure")
                          ? "secondary"
                          : "primary"
                      }
                      checked={gridVisibility}
                      onChange={(e) => {
                        IFCview.children.forEach((child) => {
                          if (
                            child.type === "GridHelper" ||
                            child.type === "AxesHelper"
                          ) {
                            child.visible = e.target.checked;
                          }
                        });
                        setGridVisibility(e.target.checked);
                      }}
                    />
                  }
                  label="Afficher une grille"
                />
              </FormGroup>
              <p>(Éch. : 1 carreau = 5x5m)</p>
            </div>
          )}
        </div>
        {isMobile ? (
          <div
            style={{
              position: "absolute",
              bottom: currentUser ? 96 : 24,
              right: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgb(255,255,255,0.5)", // Make sure this color has an opacity of less than 1
              backdropFilter: "blur(4px)", // This be the blur
              borderRadius: "8px",
              padding: "12px",
              marginTop: "8px",
            }}
          >
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    color={
                      username === "123structure" ||
                      pathname.includes("123structure")
                        ? "secondary"
                        : "primary"
                    }
                    checked={gridVisibility}
                    onChange={(e) => {
                      IFCview.children.forEach((child) => {
                        if (
                          child.type === "GridHelper" ||
                          child.type === "AxesHelper"
                        ) {
                          child.visible = e.target.checked;
                        }
                      });
                      setGridVisibility(e.target.checked);
                    }}
                  />
                }
                label="Afficher une grille"
              />
            </FormGroup>
            <p>(Éch. : 1 carreau = 5x5m)</p>
          </div>
        ) : null}
        {isMobile || ifcModelsName === "" ? null : (
          <div
            style={{
              position: "absolute",
              bottom: 32,
              right: currentUser ? 104 : 24,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              background:
                username === "123structure" || pathname.includes("123structure")
                  ? "rgb(255,240,185,0.5)"
                  : "rgb(227,242,253,0.5)", // Make sure this color has an opacity of less than 1
              backdropFilter: "blur(4px)", // This be the blur
              borderRadius: "8px",
              padding: "8px",
              marginTop: "8px",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                color:
                  username === "123structure" ||
                  pathname.includes("123structure")
                    ? "#231f20"
                    : blue[800],
                // fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              {ifcModelsName.includes(".ifc")
                ? ifcModelsName.slice(0, -4)
                : ifcModelsName}
            </Typography>
          </div>
        )}
        {currentUser ? (
          <canvas
            id="three-canvas"
            onDrop={(event) => dropHandler(event)}
            onDragOver={(event) => dragOverHandler(event)}
          ></canvas>
        ) : (
          <canvas id="three-canvas"></canvas>
        )}
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
