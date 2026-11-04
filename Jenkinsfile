
pipeline {
    agent any

    environment {
        DOCKER = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
        KUBECTL = 'C:/Program Files/Docker/Docker/resources/bin/kubectl.exe'
        KUBECONFIG = 'C:/Users/adity/.kube/config'
        IMAGE_NAME = 'devops-deployment-center'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Source code checked out from GitHub.'
            }
        }

        stage('Infrastructure Check') {
            steps {
                bat '''
                    echo Checking Docker...
                    "%DOCKER%" version

                    echo Checking Kubernetes...
                    "%KUBECTL%" get nodes
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                bat '''
                    "%DOCKER%" build -t %IMAGE_NAME%:latest .
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat '''
                    set "KUBECONFIG=%KUBECONFIG%"

                    "%KUBECTL%" apply -f k8s/deployment.yaml
                    if errorlevel 1 exit /b 1

                    "%KUBECTL%" apply -f k8s/service.yaml
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                bat '''
                    set "KUBECONFIG=%KUBECONFIG%"

                    "%KUBECTL%" rollout status deployment/devops-deployment-center --timeout=120s
                    if errorlevel 1 exit /b 1

                    "%KUBECTL%" get deployments
                    "%KUBECTL%" get pods
                    "%KUBECTL%" get services
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Docker image built and application deployed to Kubernetes.'
        }

        failure {
            echo 'FAILED: Check the Jenkins Console Output for details.'
        }
    }
}
