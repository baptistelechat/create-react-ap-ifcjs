// REACT
import React, { useEffect, useRef, useState } from "react";
// MATERIAL UI
import Slide from "@mui/material/Slide";
// THREE.js
import THREE from "./utils/three/three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
// COMPONENTS
import LoadFile from "./components/LoadFile.jsx";
import Settings from "./components/Settings";
// OTHER
import { SnackbarProvider } from "notistack";
import { Toaster } from "react-hot-toast";
// STYLES
import "./App.css";

const App = () => {
  const loaderRef = useRef();
  const [IFCview, setIFCview] = useState(null);

  //Creates the Three.js scene
  useEffect(() => {
    const scene = new THREE.Scene();
    setIFCview(scene);
    // Sets up the IFC loading
    loaderRef.current = new IFCLoader();
    loaderRef.current.ifcManager.useWebWorkers(true, "../../IFCWorker.js");
    loaderRef.current.ifcManager.setWasmPath("../../");
    loaderRef.current.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOLS: false,
    });

    //Object to store the size of the viewport
    const size = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    //Creates the camera (point of view of the user)
    const aspect = size.width / size.height;
    const camera = new THREE.PerspectiveCamera(75, aspect);
    camera.position.z = 15;
    camera.position.y = 13;
    camera.position.x = 8;

    //Creates the lights of the scene
    const lightColor = 0xffffff;

    const ambientLight = new THREE.AmbientLight(lightColor, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(lightColor, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.target.position.set(-5, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    //Sets up the renderer, fetching the canvas of the HTML
    const threeCanvas = document.getElementById("three-canvas");
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      alpha: true,
    });

    renderer.setSize(size.width, size.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    //Creates grids and axes in the scene
    const grid = new THREE.GridHelper(50, 30);
    scene.add(grid);

    const axes = new THREE.AxesHelper();
    axes.material.depthTest = false;
    axes.renderOrder = 1;
    scene.add(axes);

    //Creates the orbit controls (to navigate the scene)
    const controls = new THREE.OrbitControls(camera, threeCanvas);
    controls.enableDamping = true;
    controls.target.set(-2, 0, 0);

    //Animation loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <SnackbarProvider
      maxSnack={5}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      TransitionComponent={Slide}
    >
      <Toaster position="top-left" reverseOrder={true} />
      <Settings/>
      <LoadFile IFCview={IFCview} loaderRef={loaderRef} />
      <canvas id="three-canvas"></canvas>
    </SnackbarProvider>
  );
};

export default App;
