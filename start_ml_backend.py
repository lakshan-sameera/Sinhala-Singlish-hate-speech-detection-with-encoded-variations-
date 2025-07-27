#!/usr/bin/env python3
"""
Sinhala Hate Speech Detection ML Backend Startup Script
"""
import subprocess
import sys
import os
import time

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        'flask', 'flask_cors', 'pandas', 'numpy', 
        'scikit-learn', 'nltk', 'requests'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("Install them with: pip install " + ' '.join(missing_packages))
        return False
    
    print("✅ All dependencies are installed")
    return True

def start_ml_backend():
    """Start the ML backend server"""
    print("🤖 Starting Sinhala Hate Speech Detection ML Backend...")
    print("📊 Features:")
    print("   • Real-time hate speech classification")
    print("   • Custom CSV training data support")
    print("   • Text neutralization for inappropriate content")
    print("   • Multi-language support (Sinhala/Singlish)")
    print()
    
    if not check_dependencies():
        sys.exit(1)
    
    # Change to project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Create models directory if it doesn't exist
    os.makedirs('ml_backend/models', exist_ok=True)
    
    print("🚀 Starting Flask server on http://localhost:5001")
    print("📝 Endpoints available:")
    print("   • GET  /health - Check backend status")
    print("   • POST /train - Train model with CSV")
    print("   • POST /analyze - Analyze text content")
    print("   • POST /predict - Get hate speech predictions")
    print()
    print("⚡ Backend ready! Connect your frontend to port 5001")
    print("🔄 Training with sample data...")
    
    try:
        # Start the ML backend
        subprocess.run([sys.executable, 'ml_backend/app.py'])
    except KeyboardInterrupt:
        print("\n👋 ML Backend stopped")
    except Exception as e:
        print(f"❌ Error starting ML backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_ml_backend()