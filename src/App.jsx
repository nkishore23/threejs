import React, { useState, useEffect, Suspense, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import "./App.css";

// --- Friendly Names Mapping ---
const friendlyNames = {
    "Body_Front_4_1": "Body Front",
    "Sleeves": "Sleeves",
    "Pattern": "Front Logo/Pattern",
    // Add more mesh name mappings here
};

// ---------------------------------------------------------
// LOADER
// ---------------------------------------------------------

function Loader() {
  return (
    <Html center>
      <div
        style={{
          color: "white",
          padding: 20,
          borderRadius: 8,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        Loading 3D Model...
      </div>
    </Html>
  );
}

// ---------------------------------------------------------
// AUTO-GENERATE UVs IF MISSING
// ---------------------------------------------------------

function ensureUVs(mesh) {
  const geom = mesh.geometry;

  // Already has UVs → skip
  if (geom.attributes.uv) return;

  console.warn("UVs missing → Auto-generating...", mesh.name);

  geom.computeBoundingBox();
  geom.computeBoundingSphere();

  const pos = geom.attributes.position;
  const uvs = [];

  // Simple planar UV generation (Y projection)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Normalize to 0-1 range
    uvs.push((x + 1) / 2, (y + 1) / 2); 
  }

  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.attributes.uv.needsUpdate = true;
}

// ---------------------------------------------------------
// UTILITY — HANDLE MULTI-MATERIAL
// ---------------------------------------------------------

function forEachMaterial(mesh, fn) {
  if (!mesh || !mesh.material) return;
  if (Array.isArray(mesh.material)) mesh.material.forEach(fn);
  else fn(mesh.material);
}

function setMeshColor(mesh, color) {
  forEachMaterial(mesh, (mat) => {
    mat.color.set(color);
    mat.needsUpdate = true;
  });
}

// ---------------------------------------------------------
// APPLY IMAGE / TEXTURE
// ---------------------------------------------------------

function applyImageToMesh(mesh, texture) {
  ensureUVs(mesh);

  forEachMaterial(mesh, (mat) => {
    mat.map = texture;
    mat.needsUpdate = true;
  });
}

// ---------------------------------------------------------
// APPLY TEXT AS CANVAS TEXTURE
// ---------------------------------------------------------

function applyTextToMesh(mesh, text) {
  ensureUVs(mesh);

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.font = "bold 120px Arial"; // Slightly larger font
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;

  applyImageToMesh(mesh, texture);
}

// ---------------------------------------------------------
// GLTF MODEL
// ---------------------------------------------------------

function Model({ colors, selectedMeshName }) {
  const { scene } = useGLTF("/models/image_10.glb");
  scene.position.set(0, -2, 0);

  const highlightMaterial = useRef(
    new THREE.MeshBasicMaterial({ 
      color: 0xffff00, // Bright yellow for highlight
      wireframe: true, 
      transparent: true,
      opacity: 0.5,
      depthTest: false, // Ensure wireframe is always visible
    })
  );

  useEffect(() => {
    // Traverse scene to apply colors and handle highlighting
    scene.traverse((child) => {
      if (!child.isMesh) return;

      // 1. Restore/Apply Customization Colors
      if (child.userData.originalMaterial) {
        // Restore original material if it was highlighted previously
        child.material = child.userData.originalMaterial;
        delete child.userData.originalMaterial;
      }

      // Apply preset colors (Only if the mesh wasn't customized via color picker)
      if (child.name.includes("Body_Front_4_1")) setMeshColor(child, colors.bodyFront);
      if (child.name.includes("Sleeves")) setMeshColor(child, colors.sleeves);
      if (child.name.includes("Pattern")) setMeshColor(child, colors.pattern1);
      
      // 2. Apply Highlight
      if (child.name === selectedMeshName) {
        child.userData.originalMaterial = child.material; // Save original
        child.material = highlightMaterial.current; // Apply highlight
      }
    });
  }, [colors, selectedMeshName]);

  return <primitive object={scene} />;
}

// ---------------------------------------------------------
// SELECT MESH BY CLICK
// ---------------------------------------------------------

function SelectMesh({ setSelectedMesh }) {
  const { scene, camera } = useThree();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onClick = (e) => {
    // Standard normalized device coordinates (NDC) calculation
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    // Only intersect objects loaded by useGLTF (children of the main scene)
    const hits = raycaster.intersectObjects(scene.children, true);

    if (hits.length > 0) {
      const mesh = hits[0].object;
      
      // Only select actual meshes
      if (mesh.isMesh) {
        ensureUVs(mesh); // Ensures we can apply textures later
        setSelectedMesh(mesh);
      }
    } else {
      // Deselect if user clicks on empty space
      setSelectedMesh(null);
    }
  };

  useEffect(() => {
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [scene, camera]); // Dependencies to ensure raycaster uses current scene/camera

  return null;
}

// ---------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------

function App() {
  const [colors, setColors] = useState({
    bodyFront: "#ff0000",
    sleeves: "#00ff00",
    pattern1: "#0000ff",
  });

  const [selectedMesh, setSelectedMesh] = useState(null);
  const [userText, setUserText] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);

  // Display Name for Selected Mesh
  const selectedMeshNameDisplay = selectedMesh 
    ? friendlyNames[selectedMesh.name] || selectedMesh.name 
    : "None";


  // --- Customization Logic ---

  // TEXT
  useEffect(() => {
    if (!selectedMesh) return;

    // If text is present, override any image texture
    if (userText.trim() !== "") {
      applyTextToMesh(selectedMesh, userText);
    } else if (!uploadedImage) {
      // If text is cleared AND no image is present, clear the texture map
      forEachMaterial(selectedMesh, (mat) => {
        mat.map = null;
        mat.needsUpdate = true;
      });
    }
  }, [userText, selectedMesh, uploadedImage]);


  // IMAGE
  useEffect(() => {
    if (!selectedMesh) return;

    if (uploadedImage) {
      // If image is uploaded, clear text input state to prioritize image
      setUserText("");
      const loader = new THREE.TextureLoader();
      loader.load(uploadedImage, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;
        applyImageToMesh(selectedMesh, texture);
      });
    }
  }, [uploadedImage, selectedMesh]);

  // COLOR PICKING
  const handleColorChange = (e) => {
    if (selectedMesh) setMeshColor(selectedMesh, e.target.value);
  };

  // CLEAR IMAGE handler
  const clearImage = () => {
    if (!selectedMesh) return;
    setUploadedImage(null);
    
    // Restore to a null texture map
    forEachMaterial(selectedMesh, (mat) => {
      mat.map = null;
      mat.needsUpdate = true;
    });
  };


  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Control Panel */}
      <div
        style={{
          flex: 1,
          background: "#f8f8f8",
          padding: 30,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 30,
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          minWidth: "350px",
        }}
      >
        

        {/* --- 1. MODEL PRESET COLORS (Primary Customization) --- */}
        <div style={{ border: "1px solid #ccc", padding: 15, borderRadius: 8 }}>
          <h4>Primary Color Scheme</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Body Front:
              <input
                type="color"
                value={colors.bodyFront}
                onChange={(e) =>
                  setColors((p) => ({ ...p, bodyFront: e.target.value }))
                }
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Sleeves:
              <input
                type="color"
                value={colors.sleeves}
                onChange={(e) =>
                  setColors((p) => ({ ...p, sleeves: e.target.value }))
                }
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Pattern/Logo Area:
              <input
                type="color"
                value={colors.pattern1}
                onChange={(e) =>
                  setColors((p) => ({ ...p, pattern1: e.target.value }))
                }
              />
            </label>
          </div>
        </div>



        {/* --- 2. SELECTED MESH CUSTOMIZATION (Advanced) --- */}
        <div style={{ border: "1px solid #007bff", padding: 15, borderRadius: 8, background: selectedMesh ? "#e6f2ff" : "none" }}>
          <h4>Part-Specific Customization</h4>
          <p style={{ fontWeight: "bold", color: selectedMesh ? "#007bff" : "#666" }}>
            Selected Part: {selectedMeshNameDisplay}
          </p>

          {selectedMesh && (
            <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 15 }}>
              {/* Color Picker */}
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Part Color Override:
                <input
                  type="color"
                  value={
                    "#" +
                    (Array.isArray(selectedMesh.material)
                      ? selectedMesh.material[0].color.getHexString()
                      : selectedMesh.material.color.getHexString())
                  }
                  onChange={handleColorChange}
                />
              </label>

              <hr style={{ borderTop: "1px dashed #aaa" }} />

              {/* Text Input */}
              <label>
                **Add Custom Text/Number:**
                <input
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Enter Name or Number (e.g., TEAM 10)"
                  style={{ width: "95%", padding: 5, marginTop: 5 }}
                />
              </label>

              {/* Image Upload */}
              <label>
                **Upload Logo/Image:**
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) setUploadedImage(URL.createObjectURL(file));
                    }}
                  />
                  {uploadedImage && (
                    <button 
                      onClick={clearImage} 
                      style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
            </div>
          )}
        </div>


        
      </div>

      {/* Canvas */}
      <div style={{ flex: 2, minHeight: "100vh", background: "#333" }}>
        <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
          <ambientLight intensity={1.5} />
          <spotLight position={[5, 5, 5]} angle={0.15} intensity={1} />
          <hemisphereLight
            skyColor={"#ffffff"}
            groundColor={"#888888"}
            intensity={0.8}
          />

          <Suspense fallback={<Loader />}>
            {/* Pass the name of the selected mesh for highlighting */}
            <Model 
              colors={colors} 
              selectedMeshName={selectedMesh ? selectedMesh.name : null} 
            />
          </Suspense>

          <OrbitControls target={[0, 0, 0]} />
          <SelectMesh setSelectedMesh={setSelectedMesh} />
        </Canvas>
      </div>
    </div>
  );
}

export default App;