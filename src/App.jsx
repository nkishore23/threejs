import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import "./App.css";

function Model({ colors }) {
  const { scene } = useGLTF("/models/image_10.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        console.log("Mesh Name:", child.name);
        
        if (child.name === "Body_Front_2_1") {
          child.material.color.set(colors.bodyFront);
          child.material.needsUpdate = true;
        }
        if (child.name === "Sleeves_5_1") {
          child.material.color.set(colors.sleeves);
          child.material.needsUpdate = true;
        }
        if (child.name === "Pattern_577026_1") {
          child.material.color.set(colors.pattern1);
          child.material.needsUpdate = true;
        }
      }
    });
  }, [colors, scene]);

  return <primitive object={scene} />;
}

function App() {
  const [colors, setColors] = useState({
    bodyFront: "#ff0000",
    sleeves: "#00ff00",
    pattern1: "#0000ff",
  });

  const handleColorChange = (part) => (event) => {
    const newColor = event.target.value;
    setColors((prevColors) => ({
      ...prevColors,
      [part]: newColor,
    }));
  };

  return (
    <div className="App">
      <div className="controls">
        <div>
          <label>
            Body Front Color:
            <input
              type="color"
              value={colors.bodyFront}
              onChange={handleColorChange("bodyFront")}
            />
          </label>
        </div>
        <div>
          <label>
            Sleeves Color:
            <input
              type="color"
              value={colors.sleeves}
              onChange={handleColorChange("sleeves")}
            />
          </label>
        </div>
        <div>
          <label>
            Pattern Color:
            <input
              type="color"
              value={colors.pattern1}
              onChange={handleColorChange("pattern1")}
            />
          </label>
        </div>
      </div>
      <Canvas
        style={{ height: "100vh", background: "#ffffff" }}
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 5, 5]} angle={0.15} intensity={1} />
        
        <Model colors={colors} />

        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}

export default App;
