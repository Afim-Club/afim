// Trunk-based pipeline: every push to main is built, scanned, published and deployed.
// Assumes Jenkins credentials/tools named below; adapt to the real Jenkins setup
// (or move the stages into the shared library once it exists).
pipeline {
  agent any

  environment {
    REGISTRY = credentials('afim-registry-url')     // e.g. registry.example.com/afim
    DOMAIN   = 'afim.club'
    PUBLIC_TURNSTILE_SITE_KEY = credentials('afim-turnstile-site-key') // public site key; use a placeholder credential to disable
    TAG      = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7)}"
  }

  options { disableConcurrentBuilds(); timestamps() }

  stages {
    stage('Sonar') {
      steps {
        withSonarQubeEnv('sonarqube') { sh 'sonar-scanner' }
        timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
      }
    }

    stage('Build CMS image') {
      steps { sh 'docker build -t $REGISTRY/afim-cms:$TAG cms' }
    }

    stage('Scan CMS image') {
      steps { sh 'trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed $REGISTRY/afim-cms:$TAG' }
    }

    stage('Push and deploy CMS') {
      when { branch 'main' }
      steps {
        sh 'docker push $REGISTRY/afim-cms:$TAG'
        deployStack()
      }
    }

    // The site is static and rendered from the live CMS API, so it builds after the CMS is deployed.
    stage('Build, scan and push web and partners images') {
      when { branch 'main' }
      steps {
        sh '''
          docker build -t $REGISTRY/afim-web:$TAG \
            --build-arg STRAPI_URL=https://admin.$DOMAIN \
            --build-arg PUBLIC_STRAPI_URL=https://admin.$DOMAIN web
          trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed $REGISTRY/afim-web:$TAG
          docker push $REGISTRY/afim-web:$TAG
          docker build -t $REGISTRY/afim-partners:$TAG \
            --build-arg PUBLIC_STRAPI_URL=https://admin.$DOMAIN \
            --build-arg PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY partners
          trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed $REGISTRY/afim-partners:$TAG
          docker push $REGISTRY/afim-partners:$TAG
        '''
        deployStack()
      }
    }
  }
}

// Secrets come from a Jenkins "secret file" holding the variables of .env.example.
def deployStack() {
  withCredentials([file(credentialsId: 'afim-env', variable: 'ENV_FILE')]) {
    sh 'set -a; . "$ENV_FILE"; set +a; docker stack deploy --with-registry-auth -c infra/stack.yml afim'
  }
}
