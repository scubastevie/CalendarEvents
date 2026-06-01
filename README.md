# CivicPlus Calendar Events

CivicPlus Calendar Events is a Vite + React application for viewing and creating calendar events from the CivicPlus interview API. The app lists events, supports adding new events, includes page-size pagination, and provides calendar export options for `.ics`, Apple Calendar, and Google Calendar.

## Table of Contents

- [To Do List](#to-do-list)
- [Production Site](#production-site)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Running with Docker](#running-with-docker)
- [Deploying to Azure AKS](#deploying-to-azure-aks)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Testing](#testing)
- [Tech Stack](#tech-stack)

## To Do List

- [ ] Add ability to make recurring events
- [ ] Check site for accessibility
- [ ] Build Terraform infrastructure

## Production Site

This project does not currently have a production deployment.

Run it locally with the setup below.

## Prerequisites

Before starting, make sure you have:

- [Node.js](https://nodejs.org/) installed
- [Git](https://git-scm.com/) installed
- CivicPlus interview instance details for local environment variables

## Installation

1. Clone or open the repository.

2. Navigate into the project directory:

   ```bash
   cd CalendarEvents
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

## Environment Variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Then fill in the values:

```bash
VITE_REQUEST_PREFIX=your_request_prefix_here
VITE_API_ORIGIN=https://interview.civicplus.com
VITE_CLIENT_SECRET=your_client_secret_here
```

`VITE_CLIENT_SECRET` is used only for the fast interview/demo flow. Because Vite exposes `VITE_` variables to browser code, this should not be used for production.

## Running the Project

Start the local development server:

```bash
npm run dev
```

By default, Vite runs at:

[http://localhost:5173](http://localhost:5173)

## Running with Docker

The Docker image builds the Vite app and serves the static files with Nginx.

Load your local environment values:

```bash
set -a
source .env.local
set +a
```

Build the image:

```bash
docker build \
  --build-arg VITE_REQUEST_PREFIX \
  --build-arg VITE_API_ORIGIN \
  --build-arg VITE_CLIENT_SECRET \
  -t calendar-events .
```

Run the container:

```bash
docker run --rm -p 8080:80 calendar-events
```

Then open:

[http://localhost:8080](http://localhost:8080)

Vite variables are compiled into the static build. If you change `.env.local`, rebuild the image.

## Deploying to Azure AKS

This repo includes a small Terraform setup for Azure Kubernetes Service.

Terraform creates:

- Azure Resource Group
- Azure Container Registry
- Azure Kubernetes Service cluster
- ACR pull permission for AKS

Required local tools:

- Azure CLI
- Terraform
- Docker
- kubectl

Login to Azure:

```bash
az login
```

Create the Azure infrastructure:

```bash
cd terraform/test
terraform init
terraform plan
terraform apply
cd ../..
```

Build and push the Docker image to Azure Container Registry:

```bash
ACR_NAME=$(terraform -chdir=terraform/test output -raw acr_name)
ACR_LOGIN_SERVER=$(terraform -chdir=terraform/test output -raw acr_login_server)

set -a
source .env.local
set +a

az acr login --name "$ACR_NAME"

docker build \
  --build-arg VITE_REQUEST_PREFIX \
  --build-arg VITE_API_ORIGIN \
  --build-arg VITE_CLIENT_SECRET \
  -t "$ACR_LOGIN_SERVER/calendar-events:latest" .

docker push "$ACR_LOGIN_SERVER/calendar-events:latest"
```

Connect kubectl to the AKS cluster:

```bash
az aks get-credentials \
  --resource-group "$(terraform -chdir=terraform/test output -raw resource_group_name)" \
  --name "$(terraform -chdir=terraform/test output -raw aks_cluster_name)"
```

Deploy the app:

```bash
sed "s#REPLACE_WITH_ACR_LOGIN_SERVER#$ACR_LOGIN_SERVER#g" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
```

Get the public IP:

```bash
kubectl get service calendar-events
```

The app uses `VITE_CLIENT_SECRET` for the interview/demo flow, which means the secret is still compiled into the frontend bundle. A production deployment should move that auth call behind a backend.

## Project Structure

```text
├── k8s/                 # Kubernetes deployment and service manifests
├── public/              # Static assets
├── src/
│   ├── api/             # Simple CivicPlus API fetch calls
│   ├── App.css          # Main app styles
│   ├── App.tsx          # Main app component
│   ├── index.css        # Global styles
│   └── main.tsx         # React entry point
├── .env.example         # Example environment variables
├── .dockerignore        # Docker build exclusions
├── .gitignore           # Git ignore file
├── Dockerfile           # Docker image definition
├── eslint.config.js     # ESLint configuration
├── nginx.conf           # Nginx static site config
├── package.json         # Project metadata and scripts
├── terraform/test/      # Test Azure AKS and ACR infrastructure
├── tsconfig*.json       # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Scripts

- Start the development server:

  ```bash
  npm run dev
  ```

- Run lint checks:

  ```bash
  npm run lint
  ```

- Run tests:

  ```bash
  npm run test
  ```

- Build for production:

  ```bash
  npm run build
  ```

- Preview the production build:

  ```bash
  npm run preview
  ```

## Testing

This project uses Vitest with React Testing Library for quick unit and component coverage.

Current tests cover:

- Event API calls for pagination, auth headers, and JSON request bodies
- Loading and rendering events from the mocked API
- Calendar export actions appearing for events
- Changing the page size selector
- Opening and submitting the Add Event form
- Basic automated accessibility checks with axe

Run the test suite once:

```bash
npm run test
```

Run tests in watch mode while developing:

```bash
npm run test:watch
```

## Tech Stack

- **React** - UI library
- **TypeScript** - Static typing
- **Vite** - Development server and build tooling
- **ESLint** - Code quality checks
- **Vitest** - Test runner
- **React Testing Library** - Component testing
- **CSS** - App styling without Tailwind or Redux
