// Updated Attendance.js with full camera capture, mirrored video, persistent login, and logout button

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  FiCamera, FiCheckCircle, FiClock, FiMapPin, FiRefreshCw, FiUser, FiLogOut
} from 'react-icons/fi';
import { API_ENDPOINTS } from '../utils/api';

function Attendance() {
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [type, setType] = useState('check-in');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [myAttendance, setMyAttendance] = useState([]);
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const decoded = jwtDecode(token);
    setUserName(decoded.name);
    setUserId(decoded.userId);

    const fetchLastAttendance = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.getLastAttendance, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setType(res.data.type === 'check-in' ? 'check-out' : 'check-in');
      } catch (err) {
        console.error('Error fetching last attendance:', err);
      }
    };

    const fetchMyAttendance = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.getAllAttendance, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const filtered = res.data.filter(r => r.user?._id === decoded.userId);
        setMyAttendance(filtered);
      } catch (err) {
        console.error('Error fetching attendance:', err);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCapturing(true);
      } catch (err) {
        setError('Camera error. Check permission.');
        setIsCapturing(false);
      }
    };

    fetchLastAttendance();
    fetchMyAttendance();
    startCamera();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [navigate]);

  const compressImage = async (file, maxSizeKB = 40) => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = event => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let width = img.width, height = img.height;
          const MAX_WIDTH = 800, MAX_HEIGHT = 600;
          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width; width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height; height = MAX_HEIGHT;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const captureImage = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // Mirror horizontally
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async blob => {
      const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' });
      const compressed = await compressImage(file);
      setImage(compressed);
    }, 'image/jpeg');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!image) return setError('Capture image first.'), setIsLoading(false);

    navigator.geolocation.getCurrentPosition(async pos => {
      const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
      setLocation(coords);

      const formData = new FormData();
      formData.append('location', coords);
      formData.append('type', type);
      formData.append('image', image);

      try {
        await axios.post(API_ENDPOINTS.postAttendance, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          }
        });
        setSuccess(`${type === 'check-in' ? 'Checked in' : 'Checked out'} successfully!`);
        setImage(null);
        setLocation('');
        setShowAttendanceForm(false);
        const updated = await axios.get(API_ENDPOINTS.getAllAttendance, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMyAttendance(updated.data.filter(r => r.user?._id === userId));
      } catch (err) {
        setError(err.response?.data?.message || 'Submit error');
      } finally {
        setIsLoading(false);
      }
    }, () => {
      setError('Enable location access');
      setIsLoading(false);
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
  <div className="min-h-screen bg-gray-50 py-8 px-4 flex flex-col items-center">

    {/* Logout button */}
    <div className="w-full max-w-md flex justify-end mb-4">
      <button
        onClick={() => {
          localStorage.removeItem('token');
          navigate('/');
        }}
        className="flex items-center text-sm text-red-600 hover:text-red-700"
      >
        <FiLogOut className="mr-1" />
        Logout
      </button>
    </div>

    {/* Attendance Card */}
    <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
      {!showAttendanceForm ? (
        <>
          <h2 className="text-xl font-semibold text-center mb-6 text-gray-800">Mark Your Attendance</h2>
          <div className="flex justify-around">
            <button
              onClick={() => {
                setType('check-in');
                setShowAttendanceForm(true);
              }}
              className="w-24 h-24 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center text-center"
            >
              Check In
            </button>

            <button
              onClick={() => {
                setType('check-out');
                setShowAttendanceForm(true);
              }}
              className="w-24 h-24 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center text-center"
            >
              Check Out
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
            {type === 'check-in' ? 'Check In' : 'Check Out'}
          </h2>

          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-2">{success}</div>}

          {/* Camera or Captured Image */}
          <div className="mb-4">
            {image ? (
              <img src={URL.createObjectURL(image)} alt="Captured" className="rounded mb-2" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded mb-2 transform scale-x-[-1]"
              />
            )}
            <div className="flex justify-center space-x-3">
              {!image && (
                <button
                  onClick={captureImage}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Capture
                </button>
              )}
              {image && (
                <button
                  onClick={() => setImage(null)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Retake
                </button>
              )}
            </div>
          </div>

          {/* Submit Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="flex items-center text-sm text-gray-600">
                <FiMapPin className="mr-1 text-gray-500" />
                {location || 'Location will appear after capture'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="flex items-center text-sm text-gray-600">
                <FiClock className="mr-1 text-gray-500" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!image || isLoading}
              className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (!image || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <FiCheckCircle className="mr-2" />
                  {type === 'check-in' ? 'Submit Check-In' : 'Submit Check-Out'}
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>

    {/* Attendance Table */}
    {myAttendance.length > 0 && (
      <div className="mt-8 w-full max-w-4xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">My Attendance Records</h3>
        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {myAttendance.slice().reverse().map((record, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(record.timestamp).toLocaleDateString()}</td>
                  <td className="px-4 py-2 capitalize">{record.type}</td>
                  <td className="px-4 py-2">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-2">{record.location || 'N/A'}</td>
                  <td className="px-4 py-2">
                    {record.isInOffice ? (
                      <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full text-xs">In Office</span>
                    ) : (
                      <span className="text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full text-xs">Remote</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

}

export default Attendance;
