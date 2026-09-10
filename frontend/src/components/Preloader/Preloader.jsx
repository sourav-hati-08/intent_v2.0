import React from 'react';
import './Preloader.css';

const Preloader = () => {
    return (
        <div className="preloader-overlay">
            <div className="preloader-content">
                <div className="spinner-wrapper">
                    <div className="main-spinner"></div>
                    <div className="inner-spinner"></div>
                </div>
                <div className="loading-text">
                    <span className="char">i</span>
                    <span className="char">n</span>
                    <span className="char">t</span>
                    <span className="char">e</span>
                    <span className="char">n</span>
                    <span className="char">t</span>
                </div>
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            </div>
        </div>
    );
};

export default Preloader;
