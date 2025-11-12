import React, { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html } from "@react-three/drei";
import * as THREE from "three";
import "./App.css";

function Model({ color }) {
  const { scene } = useGLTF("/models/image_10.glb");

  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.color = new THREE.Color(color);
      child.material.metalness = 0.3;
      child.material.roughness = 0.5;
    }
  });

  return <primitive object={scene} scale={3} position={[0, -1, 0]} />;
}

function Loader() {
  return (
    <Html center>
      <p style={{ color: "white" }}>Loading 3D Model...</p>
    </Html>
  );
}

export default function App() {
  const [color, setColor] = useState("#ff0000");

  return (
    <div className="App">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      />

      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        style={{ height: "100vh", background: "#111" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <Suspense fallback={<Loader />}>
          <Model color={color} />
          <Environment preset="sunset" />
        </Suspense>
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
}
