pipeline {
    agent any

    environment {
        IMAGE_NAME = 'university/attend-ledger'
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
        APP_PORT   = '3000'
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Typecheck & Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Build Frontend Bundle') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Deploy Container with Port Forwarding') {
            steps {
                sh """
                    docker rm -f attend-ledger || true
                    docker run -d \\
                      --name attend-ledger \\
                      -p ${APP_PORT}:3000 \\
                      -v attend_data:/app/data \\
                      -v attend_logs:/app/logs \\
                      ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }
    }

    post {
        success {
            echo "Deployment succeeded. Application reachable on port ${APP_PORT}."
        }
        failure {
            echo 'Pipeline failed. Inspect Jenkins console output for stage diagnostics.'
        }
    }
}
