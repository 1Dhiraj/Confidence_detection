import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState({ Name: 'Unknown', Time: '00:00:00', status: 'Waiting' });
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Function to fetch confidence status by sending a frame
  const fetchConfidenceStatus = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video or canvas not ready');
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, 640, 480);
    const imageData = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/confidence_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, name: name || 'Unknown' }),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
      setStatus({ Name: name || 'Unknown', Time: new Date().toLocaleTimeString(), status: 'Error' });
    }
  };

  // Handle name input change
  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  // Set up webcam video feed and auto-refresh status
  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            console.log('Video stream started successfully');
          };
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError(`Could not access webcam: ${err.message}`);
      }
    };

    startVideo();

    const intervalId = setInterval(() => {
      fetchConfidenceStatus();
    }, 500); // 500ms = 0.5 seconds

    return () => {
      clearInterval(intervalId);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        console.log('Video stream stopped');
      }
    };
  }, [name]); // Include name in dependency array

  // Status color based on prediction
  const getStatusColor = () => {
    switch (status.status) {
      case 'Confident':
        return 'green';
      case 'Unconfident':
        return 'orange';
      case 'Unknown':
        return 'gray';
      case 'Error':
        return 'red';
      default:
        return 'black';
    }
  };

  return (
    <div className="App">
      <h1>Confidence Detection</h1>

      <div className="name-input">
        <label htmlFor="name">Enter Your Name: </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={handleNameChange}
          placeholder="Your name"
        />
      </div>

      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline muted className="webcam-feed" />
        <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />
      </div>

      <div className="status-container">
        <h2>Current Status</h2>
        <div className="status-display" style={{ color: getStatusColor() }}>
          <p><strong>Name:</strong> {status.Name}</p>
          <p><strong>Time:</strong> {status.Time}</p>
          <p><strong>Status:</strong> {status.status}</p>
        </div>
        {error && (
          <div className="error-message" style={{ color: 'red' }}>
            Error: {error}
          </div>
        )}
      </div>

      <div className="instructions">
        <h3>Instructions</h3>
        <ul>
          <li>Ensure your webcam is connected</li>
          <li>Position yourself in front of the camera</li>
          <li>Enter your name above</li>
          <li>Status updates automatically every 0.5 seconds</li>
        </ul>
      </div>
    </div>
  );
}

export default App;