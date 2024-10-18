import React, { useState, useRef } from 'react';
import axios from 'axios';
import './UploadForm.css';
import ClipLoader from "react-spinners/ClipLoader";

function UploadForm() {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [responseData, setResponseData] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        inputRef.current.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', file);
        setFile(null);
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResponseData(response.data);
        } catch (error) {
            console.error('Error uploading the file', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='form'>
            <form onSubmit={handleSubmit}>
                <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    ref={inputRef}
                    style={{ display: 'none' }}
                />

                <div
                    className={`drag-drop-area ${dragActive ? 'active' : ''}`}
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <p>Drag and drop a file here, or click to select a file</p>
                </div>

                {file && <p>File selected: {file.name}</p>}

                <button type="submit" disabled={!file}>Submit PO</button>
            </form>

            {loading ? (
                <ClipLoader
                    color='#554492'
                    loading={loading}
                    size={150}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
            ) : (
                responseData && (
                    <div>
                        <h2>PO Number: {responseData.po_number}</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Quantity</th>
                                    <th>Item Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {responseData.details.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.name}</td>
                                        <td>{item.Quantity}</td>
                                        <td>{item.Price}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}

export default UploadForm;
