#!/usr/bin/env python3
"""
HateGuard Development Startup Script
Starts both the ML backend and the development server
"""

import subprocess
import sys
import time
import os
from pathlib import Path

def check_port_in_use(port):
    """Check if a port is already in use"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_ml_backend():
    """Start the ML backend server"""
    print("🚀 Starting ML Backend...")
    
    if check_port_in_use(5003):
        print("⚠️  Port 5003 is already in use. ML backend might already be running.")
        return None
    
    try:
        # Start ML backend
        ml_process = subprocess.Popen(
            [sys.executable, "ml_backend/app.py"],
            cwd=Path(__file__).parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a bit for the server to start
        time.sleep(3)
        
        if ml_process.poll() is None:
            print("✅ ML Backend started successfully on port 5003")
            return ml_process
        else:
            print("❌ Failed to start ML Backend")
            return None
            
    except Exception as e:
        print(f"❌ Error starting ML Backend: {e}")
        return None

def start_dev_server():
    """Start the development server"""
    print("🚀 Starting Development Server...")
    
    if check_port_in_use(5173):
        print("⚠️  Port 5173 is already in use. Dev server might already be running.")
        return None
    
    try:
        # Start development server
        dev_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=Path(__file__).parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a bit for the server to start
        time.sleep(3)
        
        if dev_process.poll() is None:
            print("✅ Development Server started successfully on port 5173")
            return dev_process
        else:
            print("❌ Failed to start Development Server")
            return None
            
    except Exception as e:
        print(f"❌ Error starting Development Server: {e}")
        return None

def main():
    print("=" * 60)
    print("🛡️  HateGuard Development Environment")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path("ml_backend/app.py").exists():
        print("❌ Error: ml_backend/app.py not found. Please run this script from the project root.")
        sys.exit(1)
    
    if not Path("package.json").exists():
        print("❌ Error: package.json not found. Please run this script from the project root.")
        sys.exit(1)
    
    # Start ML Backend
    ml_process = start_ml_backend()
    
    # Start Development Server
    dev_process = start_dev_server()
    
    if ml_process and dev_process:
        print("\n" + "=" * 60)
        print("🎉 Both servers started successfully!")
        print("📱 Frontend: http://localhost:5173")
        print("🤖 ML Backend: http://localhost:5003")
        print("=" * 60)
        print("\nPress Ctrl+C to stop both servers...")
        
        try:
            # Keep the script running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping servers...")
            
            if ml_process:
                ml_process.terminate()
                print("✅ ML Backend stopped")
            
            if dev_process:
                dev_process.terminate()
                print("✅ Development Server stopped")
            
            print("👋 Goodbye!")
    else:
        print("\n❌ Failed to start one or more servers")
        sys.exit(1)

if __name__ == "__main__":
    main() 