const openOneDrivePicker = async (
  randomLottie,
  resetView,
  IFCview,
  loaderRef,
  loadingFileProgress,
  setOpenProgress,
  setPercentProgress
) => {
  let odOptions = {
    clientId: process.env.REACT_APP_MS_GRAPH_CLIENT_ID,
    action: "download",
    // multiSelect: true,
    advanced: {
      filter: ".ifc",
    },
    success: async function (files) {
      await randomLottie();
      await resetView();
      const ifcURL = files.value[0]["@microsoft.graph.downloadUrl"];
      loaderRef.current.ifcManager.setOnProgress((event) =>
        loadingFileProgress(event)
      );
      const object = await loaderRef.current.loadAsync(ifcURL);
      object.name = "IFCModel";
      IFCview.add(object);
      setOpenProgress(false);
      setPercentProgress("Chargement ...");
    },
    progress: function (percent) {
      console.log(percent);
    },
    cancel: function () {
      /* cancel handler */
      setOpenProgress(false);
      setPercentProgress("Chargement ...");
    },
    error: function (error) {
      setOpenProgress(false);
      setPercentProgress("Chargement ...");
      console.log(error);
    },
  };
  await setOpenProgress(true);
  await window.OneDrive.open(odOptions);
};

export default openOneDrivePicker;
