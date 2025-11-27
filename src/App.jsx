import React, { useState, useEffect, Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import "./App.css";

const FONTS = [
  "Arial",
  "Impact",
  "Roboto",
  "Poppins",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Brush Script MT",
];

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
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        Loading 3D Model...
      </div>
    </Html>
  );
}

function forEachMaterial(mesh, fn) {
  if (!mesh || !mesh.material) return;
  if (Array.isArray(mesh.material)) mesh.material.forEach(fn);
  else fn(mesh.material);
}

function setMeshColor(mesh, color) {
  forEachMaterial(mesh, (mat) => {
    mat.color.set(color);
    if (mat.map) {
      mat.map = null;
    }
    mat.needsUpdate = true;
  });
}

function Model({ colors, textConfig, logoConfig, logoImage }) {
  const { scene } = useGLTF("/models/image_10.glb");
  scene.position.set(0, -2, 0);

  const bodyRef = useRef(null);
  const textPlaneRef = useRef(null);
  const logoPlaneRef = useRef(null);

  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name.includes("Body_Front_4_1")) {
        bodyRef.current = child;
        setMeshColor(child, colors.bodyFront);
      } else if (child.name.includes("Sleeves")) {
        setMeshColor(child, colors.sleeves);
      } else if (child.name.includes("Pattern")) {
        setMeshColor(child, colors.pattern1);
      }
    });
  }, [colors, scene]);

  const createTextTexture = (text, color, fontFamily, fontSizePx, fontWeight, italic) => {
    const canvas = document.createElement("canvas");
    const ratio = 2;
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const style = `${italic ? "italic " : ""}${fontWeight === "bold" ? "700" : "400"} ${fontSizePx}px ${fontFamily}`;
    ctx.font = style;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color || "#000";
    ctx.lineWidth = Math.max(2, Math.floor(fontSizePx / 20));
    ctx.strokeStyle = "rgba(255,255,255,0)";
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  };

  const createLogoTextureFromImage = (img) => {
    if (!img) return null;
    const canvas = document.createElement("canvas");
    const w = 1024;
    const h = 1024;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const ratio = Math.min(w / img.width, h / img.height);
    const nw = img.width * ratio;
    const nh = img.height * ratio;
    ctx.drawImage(img, (w - nw) / 2, (h - nh) / 2, nw, nh);
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  };

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    if (!body.geometry.boundingBox) body.geometry.computeBoundingBox();
    const bb = body.geometry.boundingBox;
    const width = bb.max.x - bb.min.x;
    const height = bb.max.y - bb.min.y;
    const centerX = (bb.min.x + bb.max.x) / 2;
    const centerY = (bb.min.y + bb.max.y) / 2;
    const frontZ = bb.max.z + 0.01;

    if (!textPlaneRef.current && textConfig.text) {
      const planeGeo = new THREE.PlaneGeometry(1, 1);
      const initialTex = createTextTexture(textConfig.text, textConfig.color, textConfig.fontFamily, textConfig.size, textConfig.weight, textConfig.italic);
      const mat = new THREE.MeshBasicMaterial({
        map: initialTex,
        transparent: true,
        depthTest: true,
        toneMapped: false,
      });
      const plane = new THREE.Mesh(planeGeo, mat);
      plane.position.set(centerX + textConfig.offsetX, centerY + textConfig.offsetY, frontZ + 0.001);
      plane.scale.set(width * textConfig.scale, height * textConfig.scale * 0.35, 1);
      plane.renderOrder = 999;
      body.add(plane);
      textPlaneRef.current = plane;
    } else if (textPlaneRef.current) {
      const plane = textPlaneRef.current;
      plane.position.set(centerX + textConfig.offsetX, centerY + textConfig.offsetY, frontZ + 0.001);
      plane.scale.set(width * textConfig.scale, height * textConfig.scale * 0.35, 1);
      const tex = createTextTexture(textConfig.text || "", textConfig.color, textConfig.fontFamily, textConfig.size, textConfig.weight, textConfig.italic);
      if (plane.material.map) plane.material.map.dispose();
      plane.material.map = tex;
      plane.material.needsUpdate = true;
    }

    if (!logoPlaneRef.current && logoImage) {
      const planeGeo = new THREE.PlaneGeometry(1, 1);
      const img = new Image();
      img.onload = () => {
        const tex = createLogoTextureFromImage(img);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthTest: true,
          toneMapped: false,
        });
        const plane = new THREE.Mesh(planeGeo, mat);
        plane.position.set(centerX + logoConfig.offsetX, centerY + logoConfig.offsetY, frontZ + 0.002);
        plane.scale.set(width * logoConfig.scale, height * logoConfig.scale, 1);
        plane.rotation.z = logoConfig.rotation;
        plane.renderOrder = 999;
        body.add(plane);
        logoPlaneRef.current = plane;
      };
      img.src = logoImage;
    } else if (logoPlaneRef.current) {
      const plane = logoPlaneRef.current;
      plane.position.set(centerX + logoConfig.offsetX, centerY + logoConfig.offsetY, frontZ + 0.002);
      plane.scale.set(width * logoConfig.scale, height * logoConfig.scale, 1);
      plane.rotation.z = logoConfig.rotation;
      if (logoImage) {
        const img = new Image();
        img.onload = () => {
          const tex = createLogoTextureFromImage(img);
          if (plane.material.map) plane.material.map.dispose();
          plane.material.map = tex;
          plane.material.needsUpdate = true;
        };
        img.src = logoImage;
      } else {
        if (plane.material.map) {
          plane.material.map.dispose();
          plane.material.map = null;
          plane.material.needsUpdate = true;
        }
      }
    }

    return () => {
      if (textPlaneRef.current) {
        try {
          const mat = textPlaneRef.current.material;
          if (mat.map) mat.map.dispose();
          mat.dispose();
          if (body) body.remove(textPlaneRef.current);
        } catch (e) {}
        textPlaneRef.current = null;
      }
      if (logoPlaneRef.current) {
        try {
          const mat = logoPlaneRef.current.material;
          if (mat.map) mat.map.dispose();
          mat.dispose();
          if (body) body.remove(logoPlaneRef.current);
        } catch (e) {}
        logoPlaneRef.current = null;
      }
    };
  }, [textConfig, logoConfig, logoImage, scene]);

  return <primitive object={scene} />;
}

export default function App() {
  const [colors, setColors] = useState({
    bodyFront: "#ff0000",
    sleeves: "#00ffff",
    pattern1: "#0000ff",
  });

  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState(FONTS[0]);
  const [fontSize, setFontSize] = useState(120);
  const [fontWeight, setFontWeight] = useState("normal");
  const [italic, setItalic] = useState(false);
  const [textScale, setTextScale] = useState(0.9);
  const [textOffsetX, setTextOffsetX] = useState(0);
  const [textOffsetY, setTextOffsetY] = useState(0);

  const [logoFile, setLogoFile] = useState(null);
  const [logoURL, setLogoURL] = useState(null);
  const [logoScale, setLogoScale] = useState(0.35);
  const [logoOffsetX, setLogoOffsetX] = useState(0);
  const [logoOffsetY, setLogoOffsetY] = useState(-0.05);
  const [logoRotation, setLogoRotation] = useState(0);

  useEffect(() => {
    return () => {
      if (logoURL) URL.revokeObjectURL(logoURL);
    };
  }, [logoURL]);

  const onLogoUpload = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setLogoFile(null);
      setLogoURL(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setLogoFile(f);
    setLogoURL(url);
  };

  const textConfig = {
    text,
    color: textColor,
    fontFamily,
    size: fontSize,
    weight: fontWeight,
    italic,
    scale: textScale,
    offsetX: textOffsetX,
    offsetY: textOffsetY,
  };

  const logoConfig = {
    scale: logoScale,
    offsetX: logoOffsetX,
    offsetY: logoOffsetY,
    rotation: logoRotation,
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ flex: 1, background: "#f6f8fb", padding: 24, overflowY: "auto", minWidth: 360 }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Customizer — Text & Logo</h3>

        <section style={{ background: "#fff", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <h4 style={{ margin: "0 0 10px 0" }}>Text Controls</h4>

          <label style={{ display: "block", marginBottom: 8 }}>
            Text
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter custom text"
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              maxLength={24}
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <label style={{ flex: 1 }}>
              Color
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: "100%", height: 36, marginTop: 6 }} />
            </label>

            <label style={{ flex: 1 }}>
              Font
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={fontWeight === "bold"} onChange={(e) => setFontWeight(e.target.checked ? "bold" : "normal")} />
              Bold
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} />
              Italic
            </label>
          </div>

          <label style={{ display: "block", marginBottom: 8 }}>
            Size: {fontSize}px
            <input type="range" min={40} max={220} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            Scale: {textScale.toFixed(2)}
            <input type="range" min={0.2} max={1.6} step={0.01} value={textScale} onChange={(e) => setTextScale(Number(e.target.value))} style={{ width: "100%" }} />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Offset X: {textOffsetX.toFixed(2)}
              <input type="range" min={-0.6} max={0.6} step={0.01} value={textOffsetX} onChange={(e) => setTextOffsetX(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
            <label style={{ flex: 1 }}>
              Offset Y: {textOffsetY.toFixed(2)}
              <input type="range" min={-0.6} max={0.6} step={0.01} value={textOffsetY} onChange={(e) => setTextOffsetY(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
          </div>
        </section>

        <section style={{ background: "#fff", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <h4 style={{ margin: "0 0 10px 0" }}>Logo Upload & Controls</h4>

          <label style={{ display: "block", marginBottom: 8 }}>
            Upload Logo (PNG/JPG with transparency recommended)
            <input type="file" accept="image/png,image/jpeg" onChange={onLogoUpload} style={{ width: "100%", marginTop: 8 }} />
          </label>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <label style={{ flex: 1 }}>
              Scale: {logoScale.toFixed(2)}
              <input type="range" min={0.05} max={1.2} step={0.01} value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
            <label style={{ flex: 1 }}>
              Rotation: {(logoRotation * (180 / Math.PI)).toFixed(0)}°
              <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={logoRotation} onChange={(e) => setLogoRotation(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Offset X: {logoOffsetX.toFixed(2)}
              <input type="range" min={-0.6} max={0.6} step={0.01} value={logoOffsetX} onChange={(e) => setLogoOffsetX(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
            <label style={{ flex: 1 }}>
              Offset Y: {logoOffsetY.toFixed(2)}
              <input type="range" min={-0.6} max={0.6} step={0.01} value={logoOffsetY} onChange={(e) => setLogoOffsetY(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
          </div>

          {logoURL && (
            <div style={{ marginTop: 10, padding: 8, background: "#fafafa", borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#666" }}>Preview</div>
              <img src={logoURL} alt="logo-preview" style={{ maxWidth: "120px", maxHeight: "120px", marginTop: 6 }} />
            </div>
          )}
        </section>

        <section style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
          <h4 style={{ margin: "0 0 10px 0" }}>Primary Colors</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Body
              <input type="color" value={colors.bodyFront} onChange={(e) => setColors((p) => ({ ...p, bodyFront: e.target.value }))} style={{ width: "100%", marginTop: 6, height: 36 }} />
            </label>
            <label style={{ flex: 1 }}>
              Sleeves
              <input type="color" value={colors.sleeves} onChange={(e) => setColors((p) => ({ ...p, sleeves: e.target.value }))} style={{ width: "100%", marginTop: 6, height: 36 }} />
            </label>
            <label style={{ flex: 1 }}>
              Pattern
              <input type="color" value={colors.pattern1} onChange={(e) => setColors((p) => ({ ...p, pattern1: e.target.value }))} style={{ width: "100%", marginTop: 6, height: 36 }} />
            </label>
          </div>
        </section>
      </div>

      <div style={{ flex: 2, background: "#fff", position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
          <ambientLight intensity={1.2} />
          <spotLight position={[5, 5, 5]} angle={0.15} intensity={1} />
          <hemisphereLight skyColor={"#ffffff"} groundColor={"#888888"} intensity={0.8} />
          <Suspense fallback={<Loader />}>
            <Model
              colors={colors}
              textConfig={{
                text,
                color: textColor,
                fontFamily,
                size: fontSize,
                weight: fontWeight,
                italic,
                scale: textScale,
                offsetX: textOffsetX,
                offsetY: textOffsetY,
              }}
              logoConfig={{
                scale: logoScale,
                offsetX: logoOffsetX,
                offsetY: logoOffsetY,
                rotation: logoRotation,
              }}
              logoImage={logoURL}
            />
          </Suspense>
          <OrbitControls target={[0, 0, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
