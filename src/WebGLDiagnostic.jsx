import React, { useEffect, useState } from "react";

export default function WebGLDiagnostic() {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        const canvas = document.createElement("canvas");
        let gl =
            canvas.getContext("webgl2") ||
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl");

        if (!gl) {
            // Defer state update to avoid React warning
            setTimeout(() => {
                setInfo({ error: "❌ WebGL not supported or failed to initialize" });
            }, 0);
            console.error("WebGL context could not be created");
            return;
        }

        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        const vendor = debugInfo
            ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
            : "Unknown";
        const renderer = debugInfo
            ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            : "Unknown";
        const version = gl.getParameter(gl.VERSION);

        const infoData = {
            vendor,
            renderer,
            version,
            context: gl instanceof WebGL2RenderingContext ? "WebGL 2" : "WebGL 1",
        };

        console.table(infoData);

        // Defer setInfo too
        setTimeout(() => setInfo(infoData), 0);
    }, []);


    if (!info) return <p style={{ color: "white" }}>Detecting WebGL info...</p>;

    return (
        <div
            style={{
                background: "#222",
                color: "#0f0",
                padding: "10px",
                borderRadius: "10px",
                fontFamily: "monospace",
                fontSize: "14px",
                zIndex: 1000,
                marginBottom: "50px"
            }}
        >
            {info.error ? (
                <p>{info.error}</p>
            ) : (
                <>
                    <div>✅ <b>{info.context}</b></div>
                    <div>Vendor: {info.vendor}</div>
                    <div>Renderer: {info.renderer}</div>
                    <div>Version: {info.version}</div>
                </>
            )}
        </div>
    );
}
