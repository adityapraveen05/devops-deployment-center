
from flask import Flask, render_template, jsonify
import subprocess
import socket
import os
from datetime import datetime, timezone

app = Flask(__name__)

APP_VERSION = os.getenv("APP_VERSION", "1.0")
APP_ENV = os.getenv("APP_ENV", "Development")

DOCKER_EXE = os.getenv(
    "DOCKER_EXE",
    r"C:\Program Files\Docker\Docker\resources\bin\docker.exe"
)

KUBECTL_EXE = os.getenv(
    "KUBECTL_EXE",
    r"C:\Program Files\Docker\Docker\resources\bin\kubectl.exe"
)

KUBECONFIG = os.getenv(
    "KUBECONFIG",
    os.path.join(os.path.expanduser("~"), ".kube", "config")
)


def run_command(command, timeout=20, env=None):
    """Execute a system command safely."""

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=env
        )

        if result.returncode != 0:
            return None, result.stderr.strip() or "Command failed"

        return result.stdout.strip(), None

    except subprocess.TimeoutExpired:
        return None, "Command timed out"

    except FileNotFoundError:
        return None, "Executable not found"

    except Exception as error:
        return None, str(error)


def docker_command(*arguments):
    return run_command([DOCKER_EXE, *arguments])


def kubectl_command(*arguments):
    env = os.environ.copy()
    env["KUBECONFIG"] = KUBECONFIG

    return run_command(
        [KUBECTL_EXE, *arguments],
        env=env
    )


def parse_json_command(command_function, *arguments):
    import json

    output, error = command_function(*arguments)

    if error:
        return None, error

    try:
        return json.loads(output), None
    except (ValueError, TypeError):
        return None, "Unable to parse JSON output"


def get_docker_information():
    """Retrieve actual Docker engine and container information."""

    data = {
        "connected": False,
        "running_containers": 0,
        "containers": [],
        "error": None
    }

    # First verify that the Docker engine is reachable.
    _, error = docker_command("info")

    if error:
        data["error"] = error
        return data

    # Retrieve container information as separate text records.
    output, error = docker_command(
        "ps",
        "--format",
        "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"
    )

    if error:
        data["error"] = error
        return data

    for line in output.splitlines():
        parts = line.split("|", 3)

        if len(parts) != 4:
            continue

        name, image, status, ports = parts

        data["containers"].append({
            "name": name,
            "image": image,
            "status": status,
            "ports": ports or "Not exposed"
        })

    data["connected"] = True
    data["running_containers"] = len(data["containers"])

    return data


def get_kubernetes_information():
    """Retrieve actual Kubernetes nodes, Pods and deployments."""

    data = {
        "connected": False,
        "ready_pods": 0,
        "deployment_count": 0,
        "pods": [],
        "nodes": [],
        "deployments": [],
        "error": None
    }

    node_data, error = parse_json_command(
        kubectl_command,
        "get", "nodes", "-o", "json"
    )

    if error:
        data["error"] = error
        return data

    pod_data, error = parse_json_command(
        kubectl_command,
        "get", "pods", "-A", "-o", "json"
    )

    if error:
        data["error"] = error
        return data

    deployment_data, error = parse_json_command(
        kubectl_command,
        "get", "deployments", "-A", "-o", "json"
    )

    if error:
        data["error"] = error
        return data

    # Kubernetes nodes
    for node in node_data.get("items", []):

        conditions = node.get("status", {}).get("conditions", [])

        ready = any(
            condition.get("type") == "Ready"
            and condition.get("status") == "True"
            for condition in conditions
        )

        labels = node.get("metadata", {}).get("labels", {})

        roles = [
            key.replace("node-role.kubernetes.io/", "")
            for key in labels
            if key.startswith("node-role.kubernetes.io/")
        ]

        data["nodes"].append({
            "name": node["metadata"]["name"],
            "status": "Ready" if ready else "NotReady",
            "roles": ", ".join(roles) if roles else "Worker",
            "version": node.get("status", {})
            .get("nodeInfo", {})
            .get("kubeletVersion", "Unknown")
        })

    # Kubernetes Pods
    for pod in pod_data.get("items", []):

        status = pod.get("status", {})
        spec = pod.get("spec", {})

        containers = status.get("containerStatuses", [])

        ready_count = sum(
            1 for container in containers
            if container.get("ready", False)
        )

        total_count = len(spec.get("containers", []))

        ready = total_count > 0 and ready_count == total_count

        restarts = sum(
            container.get("restartCount", 0)
            for container in containers
        )

        data["pods"].append({
            "name": pod["metadata"]["name"],
            "namespace": pod["metadata"].get("namespace", "default"),
            "ready": f"{ready_count}/{total_count}",
            "status": status.get("phase", "Unknown"),
            "restarts": restarts
        })

        if ready:
            data["ready_pods"] += 1

    # Kubernetes deployments
    for deployment in deployment_data.get("items", []):

        metadata = deployment.get("metadata", {})
        status = deployment.get("status", {})
        spec = deployment.get("spec", {})

        containers = (
            spec.get("template", {})
            .get("spec", {})
            .get("containers", [])
        )

        images = [
            container.get("image", "Unknown")
            for container in containers
        ]

        data["deployments"].append({
            "name": metadata.get("name", "Unknown"),
            "namespace": metadata.get("namespace", "default"),
            "ready_replicas": status.get("readyReplicas", 0),
            "available_replicas": status.get("availableReplicas", 0),
            "image": ", ".join(images) or "Unknown"
        })

    data["deployment_count"] = len(data["deployments"])
    data["connected"] = True

    return data


@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({
        "status": "Healthy",
        "service": "DevOps Deployment Center"
    })


@app.route("/api/status")
def application_status():
    return jsonify({
        "application": "DevOps Deployment Center",
        "status": "Running",
        "version": APP_VERSION,
        "environment": APP_ENV,
        "host": socket.gethostname()
    })


@app.route("/api/infrastructure")
def infrastructure():

    return jsonify({
        "docker": get_docker_information(),
        "kubernetes": get_kubernetes_information()
    })


@app.route("/api/deployments")
def deployments():

    kubernetes = get_kubernetes_information()

    rows = []

    for item in kubernetes["deployments"]:

        rows.append({
            "name": item["name"],
            "version": item["image"],
            "environment": item["namespace"],
            "status": (
                "Running"
                if item["available_replicas"] > 0
                else "Unavailable"
            ),
            "time": "Current cluster state"
        })

    return jsonify({
        "deployments": rows
    })


@app.route("/api/deployment-history")
def deployment_history_api():

    return jsonify({
        "history": []
    })


@app.route("/api/activity")
def activity():

    return jsonify({
        "events": [{
            "time": datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S UTC"
            ),
            "event": "Infrastructure status requested",
            "component": "Monitoring API",
            "details": "Dashboard requested infrastructure information"
        }]
    })


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
