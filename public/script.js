document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const res = await fetch("/analyze", {
    method: "POST",
    body: formData
  });
  
  const data = await res.json();
  
  if (data.error) {
    document.getElementById("results").innerHTML = `<p>Error: ${data.error}</p>`;
    return;
  }
  
  document.getElementById("results").innerHTML = `
    <p><b>Descripción:</b> ${data.descripcion}</p>
    <p><b>Etiquetas:</b> ${data.etiquetas}</p>
    <p><b>Colores predominantes:</b></p>
    ${data.colores_predominantes.map(c => `<div class="color-box" style="background:${c.color}"></div>`).join("")}
    <p><b>Color principal:</b> <div class="color-box" style="background:${data.color_principal}"></div></p>
  `;
});
