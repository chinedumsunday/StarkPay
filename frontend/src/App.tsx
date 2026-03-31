import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import CreateInvoice from "./pages/CreateInvoice";
import PayInvoice from "./pages/PayInvoice";
import Success from "./pages/Success";
import Home from "./pages/Home";
import Wallet from "./pages/Wallet";

// Replace with your actual Privy App ID from https://dashboard.privy.io
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "clx1234example";

export default function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#00ff88",
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateInvoice />} />
          <Route path="/pay/:invoiceId" element={<PayInvoice />} />
          <Route path="/success" element={<Success />} />
          <Route path="/wallet" element={<Wallet />} />
        </Routes>
      </BrowserRouter>
    </PrivyProvider>
  );
}
