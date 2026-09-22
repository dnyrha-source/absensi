import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getUsers } from './lib/db'

// @ts-ignore
window.exportUsersToJson = async () => {
  console.log("Mengambil data murid dari Firebase...");
  const users = await getUsers();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "data_wajah_murid.json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  console.log("Selesai! File data_wajah_murid.json berhasil diunduh.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
