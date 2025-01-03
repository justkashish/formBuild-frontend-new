import styles from "./formeditor.module.css";
import { useUserContext } from "../../Contexts/UserContext";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Switch from "../../components/Switch/Switch";
import { api, fetchUserData } from "../../api/api";
import useAuth from "../../customHooks/useAuth";
import useFetchFlowData from "../../customHooks/useFetchFlowData";
import ResponseDisplay from "../../components/ResponseDisplay/ResponseDisplay";

const FormEditor = () => {
  useAuth();
  useFetchFlowData();
  const navigate = useNavigate();
  const {
    theme,
    userData,
    selectedForm,
    setSelectedForm,
    selectedFolder,
    setSelectedFolder,
    flowData,
    setFlowData,
    permission,
  } = useUserContext();
  const [isInputSelected, setIsInputSelected] = useState(false);
  const [currentForm, setCurrentForm] = useState(selectedForm);
  const [isFlowClicked, setIsFlowClicked] = useState(true);
  const [isResponseClicked, setIsResponseClicked] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const saveModalRef = useRef(null);
  const count = {
    TextInput: 0,
    Number: 0,
    Email: 0,
    Phone: 0,
    Date: 0,
    Rating: 0,
    TextBubble: 0,
    Image: 0,
    Video: 0,
    Gif: 0,
    Button: 0,
  };
  const [bubbleData, setBubbleData] = useState({
    TextBubble: "",
    Image: "",
    Video: "",
    Gif: "",
  });

  const inputTexts = {
    TextInput: "Hint : User will input text on form",
    Number: "Hint : User will input number on form",
    Email: "Hint : User will input email on form",
    Phone: "Hint : User will input phone on form",
    Date: "Hint : User will select a date",
    Rating: "Hint : User will tap to rate out of 5",
  };

  const label = {
    TextInput: "Input Text",
    Number: "Input Number",
    Email: "Input Email",
    Phone: "Input Phone",
    Date: "Input Date",
    Rating: "Input Rating",
    TextBubble: "Text",
    Image: "Image",
    Video: "Video",
    Gif: "GIF",
    Button: "Button",
  };
  const [errors, setErrors] = useState({}); // To track errors for each button
  const getCount = (type) => {
    count[type] += 1;
    return count[type];
  };

  const handleFlowClick = () => {
    setIsFlowClicked(!isFlowClicked);
    setIsResponseClicked(false);
  };

  const handleResponseClick = () => {
    setIsResponseClicked(!isResponseClicked);
    setIsFlowClicked(false);
  };

  const handleCloseForm = () => {
    navigate("/dashboard");
  };

  useEffect(() => {
    console.log(flowData);
    const formName = sessionStorage.getItem("selectedForm");
    if (formName) {
      setCurrentForm(formName);
      setSelectedForm(formName);
    }
    const folderName = sessionStorage.getItem("selectedFolder");
    if (folderName) {
      setSelectedFolder(folderName);
    }
  }, [flowData]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        saveModalRef.current &&
        !saveModalRef.current.contains(event.target)
      ) {
        closeModal();
      }
    };

    if (isSaveModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSaveModalOpen]);

  const closeModal = () => {
    setIsSaveModalOpen(false); // Update your modal state here
  };

  const handleInputBlur = () => {
    changeFormName();
  };

  const changeFormName = async () => {
    const folderForms =
      JSON.parse(localStorage.getItem("folderForms")) || [];
    if (
      Object.values(folderForms).some((forms) =>
        forms.includes(currentForm)
      )
    ) {
      console.log("Form with this name already exists");
      alert("Form with this name already exists");
      setCurrentForm(selectedForm);
      return;
    }

    try {
      let userId;
      if (sessionStorage.getItem("selectedWorkspace")) {
        userId = JSON.parse(
          sessionStorage.getItem("selectedWorkspace")
        )._id;
      } else {
        userId = userData._id;
      }
      if (!userId) {
        return;
      }
      const response = await api.put(`/protected/form/${userId}`, {
        formName: selectedForm,
        folderName: selectedFolder,
        newFormName: currentForm,
      });

      console.log(response);
      if (response.status === 200) {
        console.log(response);
        setSelectedForm(currentForm);
        sessionStorage.setItem("selectedForm", currentForm);
        setIsInputSelected(false);
        await fetchUserData();
      }
    } catch (error) {
      console.error("error updating formName", error);
    }
  };

  // Handle toolbox button click to add flow button
  const handleToolBoxButtonClick = (toolType) => {
    if (permission === "view") return;
    setSelectedTool(toolType);

    const newFlowData = {
      buttonType: toolType,
      id: `${toolType}-${Date.now()}`, // Unique ID based on timestamp for each click
      content: "", // Default content
      order: flowData.length + 1, // Assign order based on existing buttons
    };

    // Append the new flow button to the flowData state
    setFlowData((prevFlowData) => {
      const updatedFlowData = Array.isArray(prevFlowData)
        ? [...prevFlowData, newFlowData]
        : [newFlowData]; // Handle case where flowData is not an array
      return updatedFlowData;
    });
  };

  // Handle delete button for a flow button
  const handleDeleteFlowButton = (id) => {
    if (permission === "view") return;

    // Step 1: Filter out the button being deleted
    const updatedFlowData = flowData.filter(
      (button) => button.id !== id
    );

    // Step 2: Reassign the order to the remaining buttons (1, 2, 3, ...)
    const updatedFlowDataWithOrder = updatedFlowData.map(
      (button, index) => ({
        ...button,
        order: index + 1, // Ensure order starts from 1
      })
    );

    // Step 3: Update the flow data with the new order
    setFlowData(updatedFlowDataWithOrder);
  };

  // Handle input change for specific button type
  const handleInputChange = (e, buttonType, buttonId) => {
    const { value } = e.target;
    setFlowData((prevFlowData) =>
      prevFlowData.map((button) =>
        button.id === buttonId
          ? {
              ...button,
              content: value, // Update content with the new input value
            }
          : button
      )
    );
    setErrors((prevErrors) => {
      const updatedErrors = { ...prevErrors };
      delete updatedErrors[buttonId]; // Clear error for this input
      return updatedErrors;
    });
  };

  const handleSave = () => {
    // Validate the flowData
    console.log("flowData", flowData);
    const newErrors = {};
    flowData.forEach((button) => {
      if (
        ["TextBubble", "Image", "Video", "Gif"].includes(
          button.buttonType
        ) &&
        !button.content.trim() // Check if the content is empty
      ) {
        newErrors[button.id] = "This field is required"; // Add error for the button
      }
    });

    console.log("newErrors", newErrors);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors); // Update the state with the errors
      return; // Stop further execution if there are errors
    }

    // Proceed with saving if no errors
    setErrors({});
    const payload = flowData
      .filter((button) =>
        [
          "TextBubble",
          "Image",
          "Video",
          "Gif",
          "TextInput",
          "Button",
          "Date",
          "Number",
          "Email",
          "Phone",
          "Rating",
          "StartButton",
        ].includes(button.buttonType)
      )
      .map((button) => ({
        buttonType: button.buttonType,
        id: button.id,
        order:
          flowData.findIndex(
            (flowButton) => flowButton.id === button.id
          ) + 1,
        content: button.content || "",
      }));

    console.log("payload", payload, selectedFolder, selectedForm);
    const selectedWorkspace = JSON.parse(
      sessionStorage.getItem("selectedWorkspace")
    );
    let userId = selectedWorkspace
      ? selectedWorkspace._id
      : userData._id;

    api
      .put(`/protected/form/${userId}`, {
        formName: selectedForm,
        folderName: selectedFolder,
        elements: payload,
      })
      .then((response) => {
        console.log("Data saved successfully", response.data);
        setIsSaveModalOpen(true);
      })
      .catch((error) => {
        console.error("Error saving data", error);
      });
  };

  const handleShare = () => {
    let userId;
    if (sessionStorage.getItem("selectedWorkspace")) {
      userId = JSON.parse(
        sessionStorage.getItem("selectedWorkspace")
      )._id;
    } else {
      userId = userData._id;
    }
    // Construct a URL with minimal query parameters
    const link = `${window.location.origin}/formbot?formName=${selectedForm}&folderName=${selectedFolder}&userId=${userId}`;

    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert("Link copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
      });
  };

  return (
    <section className={styles.formEditor}>
      <nav className={styles.navBar}>
        <div className={styles.leftTray}>
          {!isInputSelected ? (
            <h1 onClick={() => setIsInputSelected(true)}>
              {selectedForm}
            </h1>
          ) : (
            <>
              {permission === "edit" ? (
                <input
                  type="text"
                  placeholder={selectedForm}
                  value={currentForm}
                  onChange={(e) => setCurrentForm(e.target.value)}
                  onBlur={handleInputBlur}
                />
              ) : (
                <h1>{selectedForm}</h1>
              )}
            </>
          )}
        </div>
        <div className={styles.middleTray}>
          <div className={styles.content}>
            <button
              onClick={handleFlowClick}
              className={`${styles.flow} ${
                isFlowClicked ? styles.active : ""
              }`}
            >
              Flow
            </button>
            <button
              onClick={handleResponseClick}
              className={`${styles.responseButton} ${
                isResponseClicked ? styles.active : ""
              }`}
            >
              Response
            </button>
          </div>
        </div>
        <div className={styles.rightTray}>
          <div className={styles.themeSelector}>
            <label htmlFor="basic-switch">Light</label>
            <Switch />
            <label htmlFor="basic-switch">Dark</label>
          </div>
          <button onClick={handleShare} className={styles.share}>
            Share
          </button>
          {permission === "edit" && (
            <button
              onClick={handleSave}
              className={`${styles.share} ${styles.save}`}
            >
              Save
            </button>
          )}

          <img
            role="button"
            onClick={handleCloseForm}
            src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734971147/close_i1fxoe.svg"
            alt="close"
          />
        </div>
      </nav>
      <main className={styles.main}>
        {isFlowClicked && (
          <div className={styles.toolBox}>
            <div className={styles.content}>
              <div className={styles.bubbles}>
                <h1>Bubbles</h1>
                <div className={styles.bubbleContent}>
                  <button
                    onClick={() =>
                      handleToolBoxButtonClick("TextBubble")
                    }
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734976788/Vector_tywr4q.svg"
                      alt="doc icon"
                    />
                    <p>Text</p>
                  </button>
                  <button
                    onClick={() => {
                      handleToolBoxButtonClick("Image");
                    }}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977696/SVG_5_zbkxik.png"
                      alt="image icon"
                    />
                    <p>Image</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Video")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977709/SVG_1_ea3rsy.svg"
                      alt="Video icon"
                    />
                    <p>Video</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Gif")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977701/Container_3_bm6fqv.png"
                      alt="gif icon"
                    />
                    <p>GIF</p>
                  </button>
                </div>
              </div>
              <div className={styles.bubbles}>
                <h1>Inputs</h1>
                <div className={styles.bubbleContent}>
                  <button
                    onClick={() =>
                      handleToolBoxButtonClick("TextInput")
                    }
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977877/SVG_6_x5vxny.png"
                      alt="doc icon"
                    />
                    <p>Text</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Number")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977948/SVG_2_qze36e.png"
                      alt="number icon"
                    />
                    <p>Number</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Email")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977951/SVG_3_krlgib.png"
                      alt="email icon"
                    />
                    <p>Email</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Phone")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977958/SVG_4_rakedz.png"
                      alt="phone icon"
                    />
                    <p>Phone</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Date")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977961/SVG_5_o1b4ja.png"
                      alt="date icon"
                    />
                    <p>Date</p>
                  </button>

                  <button
                    onClick={() => handleToolBoxButtonClick("Rating")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977965/SVG_7_snsvsb.png"
                      alt="rating icon"
                    />
                    <p>Rating</p>
                  </button>
                  <button
                    onClick={() => handleToolBoxButtonClick("Button")}
                  >
                    <img
                      src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734977969/SVG_8_ddw6ca.png"
                      alt="buttons icon"
                    />
                    <p>Buttons</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isFlowClicked && (
          <div className={styles.flowContent}>
            <div className={styles.leftGap}></div>
            <div className={styles.rightGap}>
              <div className={styles.flowDisplay}>
                <div
                  className={`${styles.flowButton} ${styles.start}`}
                  style={{ order: 0 }}
                >
                  <img
                    src={
                      theme === "light"
                        ? "https://res.cloudinary.com/dtu64orvo/image/upload/v1735017073/Vector_5_ag2xrt.png"
                        : "https://res.cloudinary.com/dtu64orvo/image/upload/v1735013851/Vector_ivnat6.svg"
                    }
                    alt="start icon"
                    className={styles.startIcon}
                  />
                  <h1>Start</h1>
                </div>
                {flowData?.map?.(
                  (button, index) =>
                    button.buttonType !== "StartButton" && (
                      <div
                        key={button._id || index}
                        className={`${styles.flowButton} ${
                          [
                            "TextBubble",
                            "Image",
                            "Video",
                            "Gif",
                          ].includes(button.buttonType)
                            ? styles.bubble
                            : ""
                        } ${
                          button.buttonType === "StartButton"
                            ? styles.start
                            : ""
                        }
                        `}
                        style={{ order: index + 1 }} // Ensure StartButton stays at the top
                      >
                        {button.buttonType !== "StartButton" && (
                          <div className={styles.ellipse}></div>
                        )}
                        {button.buttonType !== "StartButton" && (
                          <img
                            className={styles.deleteIcon}
                            onClick={() =>
                              handleDeleteFlowButton(
                                button.id || index
                              )
                            }
                            src="https://res.cloudinary.com/dtu64orvo/image/upload/v1734893849/delete_dvkcex.svg"
                            alt="delete"
                          />
                        )}
                        <h1>
                          {button.buttonType === "Button"
                            ? "Finish"
                            : `${label[button.buttonType]} ${getCount(
                                button.buttonType
                              )}`}
                        </h1>

                        {[
                          "TextBubble",
                          "Image",
                          "Video",
                          "Gif",
                        ].includes(button.buttonType) && (
                          <>
                          {console.log("button", button.id)}
                          <input
                            type="text"
                            placeholder={
                              button.buttonType === "TextBubble"
                                ? "Enter text"
                                : "Click to add link"
                            }
                            className={` ${errors[button.id] ? styles.errorInput : ""}`}
                            value={button.content || ""} // Bind the input value to the button's content
                            onChange={
                              (e) =>
                                handleInputChange(
                                  e,
                                  button.buttonType,
                                  button.id
                                ) // Pass button.id to handleInputChange
                            }
                          />
                          <p className = {styles.errorText}>{errors[button.id]}</p>
                          </>
                        )}
                        {[
                          "TextInput",
                          "Number",
                          "Email",
                          "Phone",
                          "Date",
                          "Rating",
                          "Button",
                        ].includes(button.buttonType) && (
                          <p>{inputTexts[button.buttonType]}</p>
                        )}
                      </div>
                    )
                )}
              </div>
            </div>
          </div>
        )}

        {!isFlowClicked && isResponseClicked && <ResponseDisplay />}
      </main>
      {isSaveModalOpen && (
        <div className={styles.saveModal} ref={saveModalRef}>
          <h1>Saved Successfully!! </h1>
        </div>
      )}
    </section>
  );
};

export default FormEditor;