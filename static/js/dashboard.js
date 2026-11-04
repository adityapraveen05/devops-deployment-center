
const API = {
    health: "/health",
    status: "/api/status",
    infrastructure: "/api/infrastructure",
    deployments: "/api/deployments",
    history: "/api/deployment-history",
    activity: "/api/activity"
};

const $ = (id) => document.getElementById(id);

let activityEvents = [];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value ?? "--";
}

function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2500);
}

function setStatus(id, status) {
    const element = $(id);
    if (!element) return;

    element.className = "status-badge";

    const normalized = String(status || "Unknown").toLowerCase();

    if (["online", "running", "healthy", "ready", "success", "passed"].includes(normalized)) {
        element.classList.add("online");
        element.textContent = "Online";
    } else if (["offline", "error", "failed", "failure", "unhealthy"].includes(normalized)) {
        element.classList.add("offline");
        element.textContent = "Offline";
    } else if (["warning", "degraded"].includes(normalized)) {
        element.classList.add("warning");
        element.textContent = "Warning";
    } else {
        element.classList.add("unknown");
        element.textContent = status || "Unknown";
    }
}

async function fetchJSON(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
    }

    return response.json();
}

function renderTable(id, rows, columns, emptyMessage) {
    const table = $(id);
    if (!table) return;

    if (!Array.isArray(rows) || rows.length === 0) {
        table.innerHTML = `<tr><td colspan="${columns.length}" class="empty-state">${escapeHTML(emptyMessage)}</td></tr>`;
        return;
    }

    table.innerHTML = rows.map(row => `
        <tr>
            ${columns.map(column => {
                const value = typeof column.value === "function"
                    ? column.value(row)
                    : row[column.value];

                return `<td>${escapeHTML(value ?? "--")}</td>`;
            }).join("")}
        </tr>
    `).join("");
}

async function loadHealth() {
    try {
        const data = await fetchJSON(API.health);

        const status = data.status || "Healthy";
        setText("appStatus", status);
        $("appStatusDot")?.classList.add("online");

        const dot = $("connectionDot");
        dot?.classList.add("online");
        dot?.classList.remove("offline");

        setText("connectionText", "Backend connected");
    } catch (error) {
        setText("appStatus", "Unavailable");

        const dot = $("connectionDot");
        dot?.classList.remove("online");
        dot?.classList.add("offline");

        setText("connectionText", "Backend unavailable");
        $("appStatusDot")?.classList.remove("online");
    }
}

async function loadApplicationStatus() {
    try {
        const data = await fetchJSON(API.status);

        setText("appVersion", data.version);
        setText("appEnvironment", data.environment);
        setText("appHost", data.host);
    } catch (error) {
        console.warn("Application status unavailable:", error.message);
    }
}

async function loadInfrastructure() {
    try {
        const data = await fetchJSON(API.infrastructure);

        const docker = data.docker || {};
        const kubernetes = data.kubernetes || {};

        setStatus(
            "dockerStatus",
            docker.connected ? "Online" : "Offline"
        );

        setStatus(
            "kubernetesStatus",
            kubernetes.connected ? "Online" : "Offline"
        );

        setText("containerCount", docker.running_containers ?? "--");
        setText("podCount", kubernetes.ready_pods ?? "--");
        setText("deploymentCount", kubernetes.deployment_count ?? "--");

        renderTable(
            "containerTable",
            docker.containers,
            [
                { value: "name" },
                { value: "image" },
                { value: "status" },
                { value: "ports" }
            ],
            "No running containers found."
        );

        renderTable(
            "podTable",
            kubernetes.pods,
            [
                { value: "name" },
                { value: "namespace" },
                { value: "ready" },
                { value: "status" },
                { value: "restarts" }
            ],
            "No Pods found."
        );

        renderTable(
            "nodeTable",
            kubernetes.nodes,
            [
                { value: "name" },
                { value: "status" },
                { value: "roles" },
                { value: "version" }
            ],
            "No Kubernetes nodes found."
        );

        const deployments = kubernetes.deployments || [];

        setText("allDeploymentCount", deployments.length);

        const replicas = deployments.reduce(
            (total, deployment) => total + Number(deployment.available_replicas || 0),
            0
        );

        setText("replicaCount", replicas);

        renderTable(
            "deploymentTable",
            deployments,
            [
                { value: "name" },
                { value: "namespace" },
                { value: "ready_replicas" },
                { value: "available_replicas" },
                { value: "image" }
            ],
            "No deployments found."
        );

    } catch (error) {
        console.warn("Infrastructure data unavailable:", error.message);

        setStatus("dockerStatus", "Unknown");
        setStatus("kubernetesStatus", "Unknown");
    }
}

async function loadDeployments() {
    try {
        const data = await fetchJSON(API.deployments);
        const rows = data.deployments || [];

        renderTable(
            "recentDeployments",
            rows.slice(0, 5),
            [
                { value: "name" },
                { value: "version" },
                { value: "environment" },
                { value: "status" },
                { value: "time" }
            ],
            "No deployment records available yet."
        );
    } catch (error) {
        console.warn("Deployment data unavailable:", error.message);
    }
}

async function loadHistory() {
    try {
        const data = await fetchJSON(API.history);
        const history = data.history || [];

        renderTable(
            "deploymentHistory",
            history,
            [
                { value: "name" },
                { value: "version" },
                { value: "environment" },
                { value: "status" },
                { value: "time" }
            ],
            "No deployment history recorded yet."
        );
    } catch (error) {
        console.warn("Deployment history unavailable:", error.message);
    }
}

async function loadActivity() {
    try {
        const data = await fetchJSON(API.activity);
        activityEvents = data.events || [];

        renderTable(
            "activityTable",
            activityEvents,
            [
                { value: "time" },
                { value: "event" },
                { value: "component" },
                { value: "details" }
            ],
            "No activity events recorded yet."
        );
    } catch (error) {
        console.warn("Activity data unavailable:", error.message);
    }
}

async function refreshDashboard() {
    const button = $("refreshButton");

    button?.classList.add("loading");

    await Promise.allSettled([
        loadHealth(),
        loadApplicationStatus(),
        loadInfrastructure(),
        loadDeployments(),
        loadHistory(),
        loadActivity()
    ]);

    setText("lastUpdated", new Date().toLocaleTimeString());

    button?.classList.remove("loading");
}

function navigate(page) {
    document.querySelectorAll(".page").forEach(element => {
        element.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach(element => {
        element.classList.remove("active");
    });

    const target = $(`page-${page}`);

    if (!target) return;

    target.classList.add("active");

    const activeButton = document.querySelector(
        `.nav-item[data-page="${page}"]`
    );

    activeButton?.classList.add("active");

    const title = activeButton?.textContent.trim() || "Overview";

    setText("pageTitle", page === "overview" ? "Deployment Overview" : title);
    setText("breadcrumb", title);

    $("sidebar")?.classList.remove("open");

    if (window.lucide) lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.page);
        });
    });

    document.querySelectorAll("[data-navigate]").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.navigate);
        });
    });

    $("refreshButton")?.addEventListener("click", () => {
        refreshDashboard();
        showToast("Refreshing infrastructure information...");
    });

    $("menuToggle")?.addEventListener("click", () => {
        $("sidebar")?.classList.toggle("open");
    });

    refreshDashboard();

    // Refresh monitoring data every 15 seconds.
    setInterval(refreshDashboard, 15000);

    if (window.lucide) lucide.createIcons();
});
