let plotCount = 0;
let lastDoc;

function toggleTheme() {
  document.body.classList.toggle("dark");
}

function toggleCollapsible() {
  const content = document.querySelector(".collapsible-content");
  content.style.display = content.style.display === "block" ? "none" : "block";
}

function handleCompanyChange(selectElem, inputId) {
  const input = document.getElementById(inputId);
  input.style.display = selectElem.value === "new" ? "block" : "none";
}

function removePlot(button) {
    const container = button.closest(".result-template");
    container.remove();
    renumberPlots();
  
    // Reset plotCount if all plots are removed
    const remaining = document.querySelectorAll(".result-template").length;
    if (remaining === 0) {
      plotCount = 0;
    }
  }
  

  function addPlotForm() {
    plotCount = document.querySelectorAll(".result-template").length + 1;

    const plotForm = document.createElement("div");
    plotForm.classList.add("result-template");
    plotForm.setAttribute("data-id", plotCount);
    plotForm.innerHTML = `
     <h3>
     Plot ${plotCount}
     <button class="toggle-btn" style="font-size: 0.9rem; padding: 8px 14px; background-color: #ff0000;" onclick="removePlot(this)">Delete</button>
     </h3>
     <label>Plot No: <input type="number" id="plotNo${plotCount}"></label>
     <label>Plot Type:
     <select id="plotType${plotCount}">
     <option value="Commercial Plots">Commercial Plots</option>
     <option value="Residential Plots">Residential Plots</option>
     </select>
     </label>
     <label>Square Feet: <input type="number" id="squareFeet${plotCount}"></label>
     <label>Rate per Sqft: <input type="number" id="squareFeetRate${plotCount}"></label>
     <label>Guideline Value: <input type="number" id="guidValue${plotCount}"></label>
     <label>GV(%): <input type="number" id="tax${plotCount}"></label>
     <label>Patta & Registration Docs: <input type="number" id="prd${plotCount}"></label>
     <label>Plot Image (optional): <input type="file" id="plotImage${plotCount}" accept="image/*"></label>
    `;
    document.getElementById("plotsContainer").appendChild(plotForm);
}


function renumberPlots() {
  const plotForms = document.querySelectorAll(".result-template");
  plotForms.forEach((form, index) => {
    const newIndex = index + 1;
    form.setAttribute("data-id", newIndex);
    form.querySelector("h3").innerHTML = `
      Plot ${newIndex}
      <button class="toggle-btn" style="font-size: 0.9rem; padding: 8px 14px; background-color: #ff0000;" onclick="removePlot(this)">Delete</button>
    `;
    const inputs = form.querySelectorAll("input, select");
    inputs.forEach(input => {
      const base = input.id.replace(/\d+$/, "");
      input.id = `${base}${newIndex}`;
    });
  });
}

function closeModal() {
  document.getElementById("pdfModal").style.display = "none";
}

function downloadLastPDF() {
  if (lastDoc) lastDoc.save("Quotation.pdf");
}

function getCompanyAddress() {
  const sel = document.getElementById("companyAddressSelect");
  return sel.value === "new"
    ? document.getElementById("companyAddressInput").value
    : sel.value;
}

function getCompanyName() {
  const sel = document.getElementById("companyNameSelect");
  return sel.value === "new"
    ? document.getElementById("companyNameInput").value
    : sel.value;
}

function getPlotData() {
  const plots = [];
  const forms = document.querySelectorAll(".result-template");
  plotCount = forms.length;

  forms.forEach((form, index) => {
    const id = index + 1;
    const plotNo = +document.getElementById(`plotNo${id}`).value;
    const sqft = +document.getElementById(`squareFeet${id}`).value;
    const rate = +document.getElementById(`squareFeetRate${id}`).value;
    const gvPercent = +document.getElementById(`tax${id}`).value;
    const gvRate = +document.getElementById(`guidValue${id}`).value;
    const gv = Math.round(sqft * gvRate * (gvPercent / 100));
    const prd = +document.getElementById(`prd${id}`).value;
    const value = sqft * rate;
    const total = value + gv + prd;

    const imageInput = document.getElementById(`plotImage${id}`);
    let image = null;
    if (imageInput && imageInput.files && imageInput.files.length > 0) {
      image = URL.createObjectURL(imageInput.files[0]);
    }

    plots.push({
      no: plotNo,
      type: document.getElementById(`plotType${id}`).value,
      sqft,
      rate,
      value,
      gv,
      gvRate,
      gvPercent,
      prd,
      total,
      image
    });
  });

  return plots;
}

async function generatePDF(preview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const plots = getPlotData();
  const logoFile = document.getElementById('logoInput').files[0];
  const logo = logoFile ? await getBase64Image(logoFile) : null;

  if (logo) doc.addImage(logo, 'PNG', 40, 40, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(getCompanyName(), 120, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Name: ${document.getElementById('userName').value}`, 40, 110);
  doc.text(`Role: ${document.getElementById('userRole').value}`, 40, 130);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 150);
  doc.text(`Phone No: ${document.getElementById('userPhone').value}`, 350, 110);
  doc.text(`Plot Address: ${getCompanyAddress()}`, 350, 130, { maxWidth: 200 });

  const tableData = plots.map((plot, index) => [
    index + 1,
    plot.no,
    plot.type,
    plot.sqft,
    plot.rate,
    plot.value,
    plot.gv,
    plot.gvPercent+"%",
    plot.prd,
    plot.total
  ]);

  doc.autoTable({
    head: [["S.No", "Plot No", "Type", "SQFT", "Rate", "Value", "GV", "GV%", "PRD", "Total"]],
    body: tableData,
    startY: 170,
    styles: { fontSize: 10.5, cellPadding: 3.5, textColor: [0, 0, 0] }, // Body text black
    headStyles: { fillColor: [186, 85, 211], textColor: [255, 255, 255] } // Heading text white
});

  let currentY = doc.autoTable.previous.finalY + 20;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text("Plot Details", 40, currentY);
  currentY += 10;

  plots.forEach((plot, i) => {
    if (currentY + 120 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      currentY = 40;
    }

    const rowY = currentY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setFillColor(135, 206, 250);
    doc.rect(40, rowY, pageWidth - 80, 18, 'F');
    doc.text(`Plot ${i + 1} - ${plot.type}`, 50, rowY + 14);

    currentY = rowY + 30;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = [
      `• Plot No = ${plot.no}`,
      `• SQFT = ${plot.sqft}, Rate per SQFT = ${plot.rate}`,
      `• Plot Value: ${plot.value}`,
      `• GV => SQFT × GV Rate × GV% = ${plot.sqft} × ${plot.gvRate} × ${plot.gvPercent}% = ${plot.gv}`,
      `• PRD = ${plot.prd}`,
      `• Total => Plot Value + GV + PRD = ${plot.total}`
    ];
    lines.forEach(line => {
      if (currentY + 14 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        currentY = 40;
      }
      doc.text(line, 50, currentY);
      currentY += 14;
    });
    currentY += 10;
  });

  const imagePlots = plots.filter(p => p.image);
  for (let i = 0; i < imagePlots.length; i += 2) {
    doc.addPage();
    const top = imagePlots[i];
    const bottom = imagePlots[i + 1];

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');

    if (top) {
      doc.text(`Plot No. ${top.no}`, pageWidth / 2, 40, { align: 'center' });
      const topImg = await toBase64(top.image);
      doc.setDrawColor(0, 112, 255);
      doc.rect(70, 60, 460, 300);
      doc.addImage(topImg, 'JPEG', 70, 60, 460, 300);
    }

    if (bottom) {
      doc.text(`Plot No. ${bottom.no}`, pageWidth / 2, 380, { align: 'center' });
      const bottomImg = await toBase64(bottom.image);
      doc.setDrawColor(0, 112, 255);
      doc.rect(70, 400, 460, 300);
      doc.addImage(bottomImg, 'JPEG', 70, 400, 460, 300);
    }
  }

  lastDoc = doc;
  if (preview) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    document.getElementById('pdfViewer').src = url;
    document.getElementById('pdfModal').style.display = 'block';
  } else {
    doc.save('Quotation.pdf');
  }
}

function getBase64Image(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
  
  function toBase64(url) {
    return fetch(url)
      .then(r => r.blob())
      .then(blob => new Promise(res => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.readAsDataURL(blob);
      }));
    }