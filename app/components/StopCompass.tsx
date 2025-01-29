import React, { useState } from "react";

export default function StopCompass() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request permission for device orientation (iOS specific)
  function requestOrientationPermission() {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            setPermissionGranted(true);
          } else {
            alert("Permission not granted for sensor data.");
          }
        })
        .catch(console.error);
    } else {
      // For non-iOS devices that don't require permission
      setPermissionGranted(true);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "1em" }}>
      <button 
        onClick={requestOrientationPermission}
        disabled={permissionGranted}
      >
        {permissionGranted ? "🙈" : "🧭"}
      </button>
    </div>
  );
}