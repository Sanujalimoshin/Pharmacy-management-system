const API_URL = "http://localhost:3000/api";

const medicineForm = document.getElementById("medicineForm");
const medicineTableBody = document.getElementById("medicineTableBody");

let editingId = null;
let medicines = [];

// ================= AUTHENTICATION =================

function getToken() {
    return localStorage.getItem("token");
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        if (
            data.error &&
            (data.error.includes("Token") ||
             data.error.includes("token") ||
             data.error.includes("expired"))
        ) {
            localStorage.removeItem("token");
        }

        throw new Error(data.error || "Access denied. Please login again.");
    }

    if (!response.ok) {
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

// ================= DASHBOARD =================

function updateDashboard() {
    const totalMedicines = document.getElementById("totalMedicines");
    const totalStock = document.getElementById("totalStock");

    if (totalMedicines) {
        totalMedicines.textContent = medicines.length;
    }

    if (totalStock) {
        totalStock.textContent = medicines.reduce(
            (total, medicine) => total + Number(medicine.quantity || 0),
            0
        );
    }
}

// ================= DISPLAY MEDICINES =================

function displayMedicines() {
    if (!medicineTableBody) return;

    medicineTableBody.replaceChildren();

    medicines.forEach(medicine => {
        const row = document.createElement("tr");
        row.dataset.id = medicine.medicine_id;

        const values = [
            medicine.medicine_name,
            medicine.category,
            medicine.supplier || "",
            Number(medicine.price).toFixed(2),
            medicine.quantity
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";
        editButton.addEventListener("click", () => editMedicine(medicine.medicine_id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.addEventListener("click", () => deleteMedicine(medicine.medicine_id));

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);

        medicineTableBody.appendChild(row);
    });

    updateDashboard();
    applyMedicineSearch();
}

// ================= LOAD MEDICINES FROM DATABASE =================

async function loadMedicines() {
    if (!medicineTableBody || !getToken()) return;

    try {
        medicines = await apiRequest("/medicines");
        displayMedicines();
    } catch (error) {
        console.error("Load medicines error:", error);
        alert(error.message);
    }
}

// ================= ADD / UPDATE MEDICINE =================

if (medicineForm) {
    medicineForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("medicineName").value.trim();
        const category = document.getElementById("category").value.trim();
        const supplier = document.getElementById("supplier").value.trim();
        const priceValue = document.getElementById("price").value;
        const stockValue = document.getElementById("stock").value;

        const price = Number(priceValue);
        const quantity = Number(stockValue);

        if (
            !name ||
            !category ||
            !supplier ||
            priceValue === "" ||
            stockValue === "" ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            alert("Please enter valid details in all fields.");
            return;
        }

        if (!getToken()) {
            alert("Please login before managing medicines.");
            return;
        }

        const medicineData = {
            medicine_name: name,
            category: category,
            supplier: supplier,
            price: price,
            quantity: quantity
        };

        const submitButton = medicineForm.querySelector(
            "button[type='submit']"
        );

        try {
            if (submitButton) submitButton.disabled = true;

            if (editingId !== null) {
                await apiRequest(`/medicines/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(medicineData)
                });

                alert("Medicine updated successfully!");
            } else {
                await apiRequest("/medicines", {
                    method: "POST",
                    body: JSON.stringify(medicineData)
                });

                alert("Medicine added successfully!");
            }

            editingId = null;
            medicineForm.reset();

            if (submitButton) {
                submitButton.textContent = "+ Add Medicine";
            }

            await loadMedicines();

        } catch (error) {
            console.error("Save medicine error:", error);
            alert(error.message);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

// ================= EDIT MEDICINE =================

function editMedicine(id) {
    const medicine = medicines.find(
        item => Number(item.medicine_id) === Number(id)
    );

    if (!medicine || !medicineForm) return;

    document.getElementById("medicineName").value = medicine.medicine_name;
    document.getElementById("category").value = medicine.category;
    document.getElementById("supplier").value = medicine.supplier || "";
    document.getElementById("price").value = medicine.price;
    document.getElementById("stock").value = medicine.quantity;

    editingId = medicine.medicine_id;

    const submitButton = medicineForm.querySelector(
        "button[type='submit']"
    );

    if (submitButton) {
        submitButton.textContent = "Update Medicine";
    }

    medicineForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// ================= DELETE MEDICINE =================

async function deleteMedicine(id) {
    if (!confirm("Are you sure you want to delete this medicine?")) {
        return;
    }

    try {
        await apiRequest(`/medicines/${id}`, {
            method: "DELETE"
        });

        if (Number(editingId) === Number(id)) {
            editingId = null;

            if (medicineForm) {
                medicineForm.reset();

                const submitButton = medicineForm.querySelector(
                    "button[type='submit']"
                );

                if (submitButton) {
                    submitButton.textContent = "+ Add Medicine";
                }
            }
        }

        alert("Medicine deleted successfully!");
        await loadMedicines();

    } catch (error) {
        console.error("Delete medicine error:", error);
        alert(error.message);
    }
}

// ================= SEARCH MEDICINES =================

function applyMedicineSearch() {
    const searchInput = document.getElementById("medicineSearch");
    if (!searchInput || !medicineTableBody) return;

    const searchText = searchInput.value.toLowerCase();

    medicineTableBody.querySelectorAll("tr").forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(searchText)
            ? ""
            : "none";
    });
}

const searchInput = document.getElementById("medicineSearch");

if (searchInput) {
    searchInput.addEventListener("input", applyMedicineSearch);
}

// ================= JQUERY HEADING INTERACTION =================

if (typeof $ !== "undefined") {
    $(document).ready(function() {
        $("h2").click(function() {
            $(this).css("text-decoration", "underline");
        });
    });
}

// ================= PHARMACY INFORMATION =================

const loadInfoButton = document.getElementById("loadInfo");

if (loadInfoButton && typeof $ !== "undefined") {
    $("#loadInfo").on("click", function() {
        $.ajax({
            url: "https://jsonplaceholder.typicode.com/users/1",
            method: "GET",

            success: function(data) {
                const info = document.getElementById("pharmacyInfo");
                if (!info) return;

                info.replaceChildren();

                const supplierLabel = document.createElement("strong");
                supplierLabel.textContent = "Supplier: ";

                const emailLabel = document.createElement("strong");
                emailLabel.textContent = "Email: ";

                info.append(
                    supplierLabel,
                    document.createTextNode(data.name),
                    document.createElement("br"),
                    emailLabel,
                    document.createTextNode(data.email)
                );
            },

            error: function() {
                const info = document.getElementById("pharmacyInfo");
                if (info) {
                    info.textContent = "Unable to load information.";
                }
            }
        });
    });
}

// ================= ADMIN LOGIN =================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const loginMessage = document.getElementById("loginMessage");

        loginMessage.textContent = "Logging in...";

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed.");
            }

            localStorage.setItem("token", data.token);

            if (data.role) {
                localStorage.setItem("role", data.role);
            }

            if (data.username) {
                localStorage.setItem("username", data.username);
            }

            loginMessage.textContent = "Login successful!";
            window.location.href = "admin.html";

        } catch (error) {
            loginMessage.textContent = error.message;
        }
    });
}

// ================= INITIAL LOAD =================

if (medicineTableBody) {
    if (getToken()) {
        loadMedicines();
    } else {
        updateDashboard();
    }
}