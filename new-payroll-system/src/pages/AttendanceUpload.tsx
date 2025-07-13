import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AttendanceUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast.error('Please select a valid Excel or CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/attendance/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data.message);
      toast.success('Attendance uploaded successfully!');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = () => {
    const link = document.createElement('a');
    link.href = '/sample-attendance-upload.csv';
    link.download = 'sample-attendance-upload.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Attendance</h1>
        <p className="text-gray-600">Upload employee attendance data from Excel or CSV files</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h3 className="font-medium text-blue-900">File Format Instructions</h3>
            <p className="text-sm text-blue-800 mt-1">
              Your file must contain the following columns: Employee ID, Date, Punch In, Punch Out
            </p>
            <ul className="text-sm text-blue-800 mt-2 list-disc list-inside">
              <li>Employee ID: Must match existing employee IDs (e.g., EMP001)</li>
              <li>Date: Format YYYY-MM-DD (e.g., 2025-01-15)</li>
              <li>Punch In: Time format HH:MM:SS (e.g., 09:00:00)</li>
              <li>Punch Out: Time format HH:MM:SS (e.g., 17:00:00)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sample Download */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Sample File</h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Sample Attendance Upload</p>
              <p className="text-sm text-gray-500">CSV format with sample data</p>
            </div>
          </div>
          <button
            onClick={downloadSample}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Sample
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Attendance File</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <div className="flex items-center p-3 bg-blue-50 rounded-md">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">{file.name}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Attendance'}
          </button>
        </div>

        {uploadResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">{uploadResult}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Uploads */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Guidelines</h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-xs font-medium text-blue-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Prepare your file</p>
              <p className="text-xs text-gray-600">Use the sample format or download the template</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-xs font-medium text-blue-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Verify employee IDs</p>
              <p className="text-xs text-gray-600">Ensure all employee IDs exist in the system</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-xs font-medium text-blue-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Upload and process</p>
              <p className="text-xs text-gray-600">The system will calculate hours worked automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceUpload;
