// client/src/components/Attendance.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiCamera, FiCheckCircle, FiClock, FiMapPin, FiRefreshCw, FiUser } from 'react-icons/fi';
import { jwtDecode } from 'jwt-decode';
import { API_ENDPOINTS } from '../utils/api';

function Attendance() {
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [type, setType] = useState('check-in');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [userName, setUserName] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setUserName(decoded.name || 'User');
    }

    const fetchLastAttendance = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.getLastAttendance, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.data.type === 'check-in') {
          setType('check-out');
        } else {
          setType('check-in');
        }
      } catch (err) {
        console.error('Error fetching last attendance:', err);
      }
    };

    fetchLastAttendance();

    const startCamera = async () => {
      try {
        setIsCapturing(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Could not access camera. Please check permissions.');
        setIsCapturing(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const compressImage = async (file, maxSizeKB = 40) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          const checkSize = () => {
            canvas.toBlob((blob) => {
              if (!blob) {
                resolve(null);
                return;
              }
              const sizeKB = blob.size / 1024;
              if (sizeKB <= maxSizeKB || quality <= 0.1) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                quality -= 0.1;
                canvas.toBlob(checkSize, 'image/jpeg', quality);
              }
            }, 'image/jpeg', quality);
          };

          checkSize();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const captureImage = async () => {
    try {
      if (!videoRef.current) return;

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        const originalFile = new File([blob], 'attendance.jpg', { type: 'image/jpeg' });
        const compressedFile = await compressImage(originalFile);
        if (compressedFile) {
          setImage(compressedFile);
        } else {
          setError('Failed to compress image');
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Error capturing image. Please try again.');
    }
  };

  const retakePhoto = () => {
    setImage(null);
    setLocation('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!image) {
      setError('Please capture an image first.');
      setIsLoading(false);
      return;
    }

    const imageSizeKB = image.size / 1024;
    if (imageSizeKB > 40) {
      setError('Image is too large. Please try capturing again.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setLocation(coords);

        const formData = new FormData();
        formData.append('location', coords);
        formData.append('type', type);
        formData.append('image', image);

        try {
          await axios.post('http://localhost:5000/attendance', formData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'multipart/form-data',
            },
          });

          setSuccess(`${type === 'check-in' ? 'Checked in' : 'Checked out'} successfully!`);
          setImage(null);
          setLocation('');
        } catch (err) {
          console.error('Attendance error:', err.response?.data || err.message);
          setError(err.response?.data?.message || 'Error submitting attendance');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Could not get your location. Please enable location services.');
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {type === 'check-in' ? 'Check In' : 'Check Out'}
            </h2>
            <p className="text-gray-600 mt-1">
              {type === 'check-in' ? 'Start your work day' : 'End your work day'}
            </p>
            {userName && (
              <div className="flex items-center justify-center mt-2 text-gray-700">
                <FiUser className="mr-1" />
                <span>{userName}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center mb-3">
              <FiMapPin className="text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">
                {location ? location : 'Location will be fetched after capture'}
              </span>
            </div>

            <div className="flex items-center mb-4">
              <FiClock className="text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">
                {new Date().toLocaleString()}
              </span>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
              {image ? (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Captured"
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Size: {(image.size / 1024).toFixed(1)}KB
                  </div>
                  <button
                    onClick={retakePhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </button>
                </div>
              ) : isCapturing ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                      onClick={captureImage}
                      className="bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition"
                    >
                      <FiCamera className="text-gray-700 text-xl" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg">
                  <div className="text-gray-500">Camera loading failed</div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendance Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="check-in">Check In</option>
                <option value="check-out">Check Out</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!image || isLoading}
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(!image || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <FiCheckCircle className="mr-2" />
                  {type === 'check-in' ? 'Check In' : 'Check Out'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Attendance;
