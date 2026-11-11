
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Common Components
import Navbar from "../components/Navbar";

// Main Pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Farmer Pages
import FarmerLayout from "../Farmer/FarmerLayout";
import FarmerDashboard from "../Farmer/FarmerDashBoard";
import AddProduct from "../Farmer/AddProduct";
import MyProducts from "../Farmer/MyProducts";
import Orders from "../Farmer/Orders";
import MyProfile from "../Farmer/MyProfile";

// Customer Pages
import CustomerLayout from "../Customer/CustomerLayout";
import CustomerDashboard from "../Customer/CustomerDashboard";
import BrowseProducts from "../Customer/BrowseProducts";
import MyCart from "../Customer/MyCart";
import CustomerOrders from "../Customer/CustomerOrders";
import CustomerProfile from "../Customer/CustomerProfile";

// Worker Pages
import WorkerLayout from "../Worker/WorkerLayout";
import WorkerDashboard from "../Worker/WorkerDashboard";
import AvailableJobs from "../Worker/AvailableJobs";
import MyTasks from "../Worker/MyTasks";
import WorkerProfile from "../Worker/WorkerProfile";

// Equipment Pages
import EquipmentLayout from "../Equipments/EquipmentLayout";
import EquipmentDashboard from "../Equipments/EquipmentDashboard";
import AddEquipment from "../Equipments/AddEquipment";
import AvailableEquipment from "../Equipments/AvailableEquipment";
import MyEquipment from "../Equipments/MyEquipment";

// Admin Pages
import AdminLayout from "../Admin/AdminLayout";
import AdminDashboard from "../Admin/AdminDashboard";
import ManageUsers from "../Admin/ManageUsers";
import ManageProducts from "../Admin/ManageProducts";
import ManageOrders from "../Admin/ManageOrders";
import ManageEquipment from "../Admin/ManageEquipment";
import ManageJobs from "../Admin/ManageJobs";
import ProtectedAdmin from "../Admin/ProtectedAdmin";
import AdminLogin from "../Admin/AdminLogin";

function AppContent() {
  const location = useLocation();

  return (
    <>
      {location.pathname === "/" && <Navbar />}

      <Routes>
        {/* Main Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Farmer Routes */}
        <Route path="/farmer" element={<FarmerLayout />}>
          <Route path="dashboard" element={<FarmerDashboard />} />
          <Route path="add-product" element={<AddProduct />} />
          <Route path="edit-product/:id" element={<AddProduct />} />
          <Route path="products" element={<MyProducts />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="products" element={<BrowseProducts />} />
          <Route path="cart" element={<MyCart />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

        {/* Worker Routes */}
        <Route path="/worker" element={<WorkerLayout />}>
          <Route path="dashboard" element={<WorkerDashboard />} />
          <Route path="jobs" element={<AvailableJobs />} />
          <Route path="tasks" element={<MyTasks />} />
          <Route path="profile" element={<WorkerProfile />} />
        </Route>

        {/* Equipment Routes */}
        <Route path="/equipment" element={<EquipmentLayout />}>
          <Route path="dashboard" element={<EquipmentDashboard />} />
          <Route path="add" element={<AddEquipment />} />
          <Route path="available" element={<AvailableEquipment />} />
          <Route path="my-equipment" element={<MyEquipment />} />
        </Route>

        {/* Admin Login - Outside Protected Route */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route element={<ProtectedAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="products" element={<ManageProducts />} />
            <Route path="orders" element={<ManageOrders />} />
            <Route path="equipment" element={<ManageEquipment />} />
            <Route path="jobs" element={<ManageJobs />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
