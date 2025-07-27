#!/usr/bin/env python3
import subprocess
import sys
import os

def main():
    """Start the ML backend server"""
    print("Starting Sinhala Hate Speech Detection ML Backend...")
    
    # Change to ML backend directory
    os.chdir('ml_backend')
    
    # Run the Flask app
    subprocess.run([sys.executable, 'app.py'])

if __name__ == "__main__":
    main()