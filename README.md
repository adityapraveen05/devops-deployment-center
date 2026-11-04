
# DevOps Deployment Center

A cloud-native DevOps monitoring and deployment platform built using Jenkins, Docker, Kubernetes, Python Flask, HTML, CSS and JavaScript.

## Project Overview

The DevOps Deployment Center provides a centralized dashboard to monitor application health, Docker containers, Kubernetes Pods, nodes and deployments.

The project demonstrates automated application deployment using a Jenkins CI/CD pipeline, Docker containerization and Kubernetes orchestration.

## Features

- Responsive DevOps monitoring dashboard
- Flask backend and REST APIs
- Docker container monitoring
- Kubernetes node and Pod monitoring
- Kubernetes deployment monitoring
- Application health monitoring
- Deployment history interface
- Jenkins CI/CD integration (implementation in progress)

## Technology Stack

| Technology | Purpose |
|---|---|
| Python Flask | Backend |
| HTML, CSS, JavaScript | Frontend |
| Docker | Containerization |
| Kubernetes | Container orchestration |
| Jenkins | CI/CD automation |
| Git and GitHub | Version control |

## Project Structure

```text
DevOps-Deployment-Center/
├── app.py
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .gitignore
├── README.md
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── dashboard.js
├── k8s/
└── tests/
```

## Run Locally

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the application:

```bash
python app.py
```

Open:

http://localhost:5000

## Run Using Docker

Build the Docker image:

```bash
docker build -t devops-deployment-center:1.0 .
```

Run the container:

```bash
docker run -d --name devops-dashboard -p 5000:5000 devops-deployment-center:1.0
```

## Project Status

- [x] Jenkins installation
- [x] Docker configuration
- [x] Kubernetes cluster setup
- [x] Flask dashboard
- [x] Docker image creation
- [x] Docker container execution
- [ ] GitHub integration
- [ ] Automated Jenkins CI/CD pipeline
- [ ] Kubernetes application deployment

## Author

Aditya Praveen
