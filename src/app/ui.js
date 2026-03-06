import { BarkType, BARK_CAP_DEFAULTS, Log } from 'log-generator';

function createSlider(label, value, min, max, step, onChange) {
  const container = document.createElement('div');
  container.className = 'control-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'control-label';
  labelEl.textContent = label;

  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'slider-wrapper';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'slider';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;

  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.className = 'slider-value';
  valueInput.value = formatValue(value, step);
  valueInput.step = step;

  slider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valueInput.value = formatValue(val, step);
    onChange(val);
  });

  valueInput.addEventListener('change', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = min;
    slider.value = val;
    valueInput.value = formatValue(val, step);
    onChange(val);
  });

  sliderWrapper.appendChild(slider);
  sliderWrapper.appendChild(valueInput);
  container.appendChild(labelEl);
  container.appendChild(sliderWrapper);

  return {
    element: container,
    setValue: (v) => {
      slider.value = v;
      valueInput.value = formatValue(v, step);
    }
  };
}

function formatValue(value, step) {
  if (step >= 1) return Math.round(value).toString();
  const decimals = step.toString().split('.')[1]?.length || 2;
  return value.toFixed(Math.min(decimals, 3));
}

function createColorPicker(label, value, onChange) {
  const container = document.createElement('div');
  container.className = 'control-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'control-label';
  labelEl.textContent = label;

  const pickerWrapper = document.createElement('div');
  pickerWrapper.className = 'color-picker-wrapper';

  const colorPreview = document.createElement('div');
  colorPreview.className = 'color-preview';
  colorPreview.style.backgroundColor = '#' + value.toString(16).padStart(6, '0');

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'color-picker';
  picker.value = '#' + value.toString(16).padStart(6, '0');

  picker.addEventListener('input', (e) => {
    const hex = parseInt(e.target.value.slice(1), 16);
    colorPreview.style.backgroundColor = e.target.value;
    onChange(hex);
  });

  pickerWrapper.appendChild(colorPreview);
  pickerWrapper.appendChild(picker);
  container.appendChild(labelEl);
  container.appendChild(pickerWrapper);

  return {
    element: container,
    setValue: (v) => {
      const hexStr = '#' + v.toString(16).padStart(6, '0');
      picker.value = hexStr;
      colorPreview.style.backgroundColor = hexStr;
    }
  };
}

function createSelect(label, options, value, onChange) {
  const container = document.createElement('div');
  container.className = 'control-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'control-label';
  labelEl.textContent = label;

  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'select-wrapper';

  const select = document.createElement('select');
  select.className = 'select';

  Object.entries(options).forEach(([key, val]) => {
    const option = document.createElement('option');
    option.value = val;
    option.textContent = key;
    if (val === value) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => onChange(e.target.value));

  selectWrapper.appendChild(select);
  container.appendChild(labelEl);
  container.appendChild(selectWrapper);

  return {
    element: container,
    setValue: (v) => { select.value = v; }
  };
}

function createToggle(label, value, onChange) {
  const container = document.createElement('div');
  container.className = 'control-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'control-label';
  labelEl.textContent = label;

  const toggleWrapper = document.createElement('div');
  toggleWrapper.className = 'toggle-wrapper';

  const toggle = document.createElement('button');
  toggle.className = 'toggle' + (value ? ' active' : '');
  toggle.innerHTML = '<span class="toggle-knob"></span>';

  toggle.addEventListener('click', () => {
    const newValue = !toggle.classList.contains('active');
    toggle.classList.toggle('active', newValue);
    onChange(newValue);
  });

  toggleWrapper.appendChild(toggle);
  container.appendChild(labelEl);
  container.appendChild(toggleWrapper);

  return {
    element: container,
    setValue: (v) => toggle.classList.toggle('active', v)
  };
}

function createButton(label, onClick) {
  const button = document.createElement('button');
  button.className = 'panel-button';
  button.innerHTML = `<span>${label}</span>`;
  button.addEventListener('click', onClick);
  return { element: button };
}

function createDisplay(label, value, formatter = (v) => v) {
  const container = document.createElement('div');
  container.className = 'control-row display-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'control-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'display-value';
  valueEl.textContent = formatter(value);

  container.appendChild(labelEl);
  container.appendChild(valueEl);

  return {
    element: container,
    setValue: (v) => { valueEl.textContent = formatter(v); }
  };
}

function createSection(title, expanded = false) {
  const section = document.createElement('div');
  section.className = 'panel-section' + (expanded ? ' expanded' : '');

  const header = document.createElement('div');
  header.className = 'section-header';

  const indicator = document.createElement('span');
  indicator.className = 'section-indicator';
  indicator.textContent = expanded ? '−' : '+';

  const titleEl = document.createElement('span');
  titleEl.className = 'section-title';
  titleEl.textContent = title;

  header.appendChild(indicator);
  header.appendChild(titleEl);

  const content = document.createElement('div');
  content.className = 'section-content';

  header.addEventListener('click', () => {
    const isExpanded = section.classList.toggle('expanded');
    indicator.textContent = isExpanded ? '−' : '+';
  });

  section.appendChild(header);
  section.appendChild(content);

  return {
    element: section,
    content,
    add: (control) => content.appendChild(control.element || control),
  };
}

export function setupUI(log) {
  const container = document.getElementById('ui-container');
  container.innerHTML = '';
  const controls = [];

  const panel = document.createElement('div');
  panel.className = 'custom-panel';

  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <button class="panel-mobile-toggle" aria-label="Toggle panel">&#x25B2;</button>
    <h1 class="panel-title">Log Generator</h1>
  `;
  panel.appendChild(header);

  const scrollArea = document.createElement('div');
  scrollArea.className = 'panel-scroll-area';
  panel.appendChild(scrollArea);

  const onChange = () => {
    log.generate();
    log.traverse((o) => {
      if (o.material) o.material.needsUpdate = true;
    });
    updateInfoDisplays();
  };

  // ----- Shape Section -----
  const shapeSection = createSection('Shape', true);

  const seedSlider = createSlider('Seed', log.options.seed, 0, 65536, 1, (val) => {
    log.options.seed = val;
    onChange();
  });
  shapeSection.add(seedSlider);
  controls.push({ control: seedSlider, update: () => seedSlider.setValue(log.options.seed) });

  shapeSection.add(createButton('Random Seed', () => {
    log.options.seed = Math.floor(Math.random() * 65536);
    refreshAllControls();
    onChange();
  }));

  shapeSection.add(createButton('Randomize All', () => {
    const r = (min, max) => min + Math.random() * (max - min);
    const ri = (min, max) => Math.floor(r(min, max + 1));

    log.options.seed = ri(0, 65536);
    log.options.length = +r(3, 20).toFixed(1);
    log.options.diameter = +r(1, 6).toFixed(1);
    log.options.taper = +r(0.05, 0.6).toFixed(2);
    log.options.eccentricity = +r(0, 0.4).toFixed(2);
    log.options.eccentricityAngle = ri(0, 360);
    log.options.curvature = +r(0, 0.8).toFixed(2);
    log.options.curvatureX = +r(-1, 1).toFixed(2);
    log.options.curvatureY = +r(-0.3, 0.3).toFixed(2);
    log.options.curvatureZ = +r(-1, 1).toFixed(2);
    log.options.roughness = +r(0, 1).toFixed(2);
    log.options.roughnessScale = +r(1, 10).toFixed(1);
    log.options.gnarls.count = ri(0, 8);
    log.options.gnarls.size = +r(0.3, 1.5).toFixed(1);
    log.options.gnarls.strength = +r(0.1, 1).toFixed(2);
    log.options.gnarls.distribution = +r(0.2, 0.8).toFixed(2);
    log.options.cap.ringCount = ri(10, 45);
    log.options.cap.heartwoodRatio = +r(0.2, 0.6).toFixed(2);
    log.options.cap.pithOffsetX = +r(-0.3, 0.3).toFixed(2);
    log.options.cap.pithOffsetY = +r(-0.3, 0.3).toFixed(2);
    log.options.cap.ringWobble = +r(0.1, 0.6).toFixed(2);
    log.options.cap.crackCount = ri(0, 4);
    log.options.cap.crackWidth = +r(0.2, 1).toFixed(1);

    refreshAllControls();
    onChange();
  }));

  const lengthSlider = createSlider('Length', log.options.length, 1, 30, 0.1, (val) => {
    log.options.length = val;
    onChange();
  });
  shapeSection.add(lengthSlider);
  controls.push({ control: lengthSlider, update: () => lengthSlider.setValue(log.options.length) });

  const diameterSlider = createSlider('Diameter', log.options.diameter, 0.5, 10, 0.1, (val) => {
    log.options.diameter = val;
    onChange();
  });
  shapeSection.add(diameterSlider);
  controls.push({ control: diameterSlider, update: () => diameterSlider.setValue(log.options.diameter) });

  const taperSlider = createSlider('Taper', log.options.taper, 0, 1, 0.01, (val) => {
    log.options.taper = val;
    onChange();
  });
  shapeSection.add(taperSlider);
  controls.push({ control: taperSlider, update: () => taperSlider.setValue(log.options.taper) });

  const eccSlider = createSlider('Eccentricity', log.options.eccentricity, 0, 0.8, 0.01, (val) => {
    log.options.eccentricity = val;
    onChange();
  });
  shapeSection.add(eccSlider);
  controls.push({ control: eccSlider, update: () => eccSlider.setValue(log.options.eccentricity) });

  const eccAngleSlider = createSlider('Ecc. Angle', log.options.eccentricityAngle, 0, 360, 1, (val) => {
    log.options.eccentricityAngle = val;
    onChange();
  });
  shapeSection.add(eccAngleSlider);
  controls.push({ control: eccAngleSlider, update: () => eccAngleSlider.setValue(log.options.eccentricityAngle) });

  scrollArea.appendChild(shapeSection.element);

  // ----- Curvature Section -----
  const curveSection = createSection('Curvature', false);

  const curvSlider = createSlider('Amount', log.options.curvature, 0, 2, 0.01, (val) => {
    log.options.curvature = val;
    onChange();
  });
  curveSection.add(curvSlider);
  controls.push({ control: curvSlider, update: () => curvSlider.setValue(log.options.curvature) });

  const curvXSlider = createSlider('Direction X', log.options.curvatureX, -1, 1, 0.01, (val) => {
    log.options.curvatureX = val;
    onChange();
  });
  curveSection.add(curvXSlider);
  controls.push({ control: curvXSlider, update: () => curvXSlider.setValue(log.options.curvatureX) });

  const curvYSlider = createSlider('Direction Y', log.options.curvatureY, -1, 1, 0.01, (val) => {
    log.options.curvatureY = val;
    onChange();
  });
  curveSection.add(curvYSlider);
  controls.push({ control: curvYSlider, update: () => curvYSlider.setValue(log.options.curvatureY) });

  const curvZSlider = createSlider('Direction Z', log.options.curvatureZ, -1, 1, 0.01, (val) => {
    log.options.curvatureZ = val;
    onChange();
  });
  curveSection.add(curvZSlider);
  controls.push({ control: curvZSlider, update: () => curvZSlider.setValue(log.options.curvatureZ) });

  scrollArea.appendChild(curveSection.element);

  // ----- Surface Section -----
  const surfaceSection = createSection('Surface', false);

  const roughSlider = createSlider('Roughness', log.options.roughness, 0, 2, 0.01, (val) => {
    log.options.roughness = val;
    onChange();
  });
  surfaceSection.add(roughSlider);
  controls.push({ control: roughSlider, update: () => roughSlider.setValue(log.options.roughness) });

  const roughScaleSlider = createSlider('Rough. Scale', log.options.roughnessScale, 0.5, 20, 0.1, (val) => {
    log.options.roughnessScale = val;
    onChange();
  });
  surfaceSection.add(roughScaleSlider);
  controls.push({ control: roughScaleSlider, update: () => roughScaleSlider.setValue(log.options.roughnessScale) });

  scrollArea.appendChild(surfaceSection.element);

  // ----- Gnarls Section -----
  const gnarlSection = createSection('Gnarls', false);

  const gnarlCountSlider = createSlider('Count', log.options.gnarls.count, 0, 20, 1, (val) => {
    log.options.gnarls.count = val;
    onChange();
  });
  gnarlSection.add(gnarlCountSlider);
  controls.push({ control: gnarlCountSlider, update: () => gnarlCountSlider.setValue(log.options.gnarls.count) });

  const gnarlSizeSlider = createSlider('Size', log.options.gnarls.size, 0.1, 3, 0.1, (val) => {
    log.options.gnarls.size = val;
    onChange();
  });
  gnarlSection.add(gnarlSizeSlider);
  controls.push({ control: gnarlSizeSlider, update: () => gnarlSizeSlider.setValue(log.options.gnarls.size) });

  const gnarlStrengthSlider = createSlider('Strength', log.options.gnarls.strength, 0, 2, 0.01, (val) => {
    log.options.gnarls.strength = val;
    onChange();
  });
  gnarlSection.add(gnarlStrengthSlider);
  controls.push({ control: gnarlStrengthSlider, update: () => gnarlStrengthSlider.setValue(log.options.gnarls.strength) });

  const gnarlDistSlider = createSlider('Distribution', log.options.gnarls.distribution, 0, 1, 0.01, (val) => {
    log.options.gnarls.distribution = val;
    onChange();
  });
  gnarlSection.add(gnarlDistSlider);
  controls.push({ control: gnarlDistSlider, update: () => gnarlDistSlider.setValue(log.options.gnarls.distribution) });

  scrollArea.appendChild(gnarlSection.element);

  // ----- Bark Section -----
  const barkSection = createSection('Bark', false);

  const barkTypeSelect = createSelect('Type', BarkType, log.options.bark.type, (val) => {
    log.options.bark.type = val;
    const capDefaults = BARK_CAP_DEFAULTS[val];
    if (capDefaults) {
      log.options.cap.heartwoodColor = capDefaults.heartwoodColor;
      log.options.cap.sapwoodColor = capDefaults.sapwoodColor;
      hwColorPicker.setValue(capDefaults.heartwoodColor);
      swColorPicker.setValue(capDefaults.sapwoodColor);
    }
    onChange();
  });
  barkSection.add(barkTypeSelect);
  controls.push({ control: barkTypeSelect, update: () => barkTypeSelect.setValue(log.options.bark.type) });

  const flatShadingToggle = createToggle('Flat Shading', log.options.bark.flatShading, (val) => {
    log.options.bark.flatShading = val;
    onChange();
  });
  barkSection.add(flatShadingToggle);
  controls.push({ control: flatShadingToggle, update: () => flatShadingToggle.setValue(log.options.bark.flatShading) });

  const texturedToggle = createToggle('Textured', log.options.bark.textured, (val) => {
    log.options.bark.textured = val;
    onChange();
  });
  barkSection.add(texturedToggle);
  controls.push({ control: texturedToggle, update: () => texturedToggle.setValue(log.options.bark.textured) });

  const texScaleXSlider = createSlider('Tex Scale X', log.options.bark.textureScale.x, 0.5, 5, 0.1, (val) => {
    log.options.bark.textureScale.x = val;
    onChange();
  });
  barkSection.add(texScaleXSlider);
  controls.push({ control: texScaleXSlider, update: () => texScaleXSlider.setValue(log.options.bark.textureScale.x) });

  const texScaleYSlider = createSlider('Tex Scale Y', log.options.bark.textureScale.y, 0.5, 5, 0.1, (val) => {
    log.options.bark.textureScale.y = val;
    onChange();
  });
  barkSection.add(texScaleYSlider);
  controls.push({ control: texScaleYSlider, update: () => texScaleYSlider.setValue(log.options.bark.textureScale.y) });

  scrollArea.appendChild(barkSection.element);

  // ----- Cap (Cross-Section) Section -----
  const capSection = createSection('Cross-Section', false);

  const ringCountSlider = createSlider('Ring Count', log.options.cap.ringCount, 5, 60, 1, (val) => {
    log.options.cap.ringCount = val;
    onChange();
  });
  capSection.add(ringCountSlider);
  controls.push({ control: ringCountSlider, update: () => ringCountSlider.setValue(log.options.cap.ringCount) });

  const heartwoodRatioSlider = createSlider('Heartwood', log.options.cap.heartwoodRatio, 0.1, 0.9, 0.01, (val) => {
    log.options.cap.heartwoodRatio = val;
    onChange();
  });
  capSection.add(heartwoodRatioSlider);
  controls.push({ control: heartwoodRatioSlider, update: () => heartwoodRatioSlider.setValue(log.options.cap.heartwoodRatio) });

  const hwColorPicker = createColorPicker('Heart Color', log.options.cap.heartwoodColor, (val) => {
    log.options.cap.heartwoodColor = val;
    onChange();
  });
  capSection.add(hwColorPicker);
  controls.push({ control: hwColorPicker, update: () => hwColorPicker.setValue(log.options.cap.heartwoodColor) });

  const swColorPicker = createColorPicker('Sap Color', log.options.cap.sapwoodColor, (val) => {
    log.options.cap.sapwoodColor = val;
    onChange();
  });
  capSection.add(swColorPicker);
  controls.push({ control: swColorPicker, update: () => swColorPicker.setValue(log.options.cap.sapwoodColor) });

  const pithXSlider = createSlider('Pith Offset X', log.options.cap.pithOffsetX, -0.8, 0.8, 0.01, (val) => {
    log.options.cap.pithOffsetX = val;
    onChange();
  });
  capSection.add(pithXSlider);
  controls.push({ control: pithXSlider, update: () => pithXSlider.setValue(log.options.cap.pithOffsetX) });

  const pithYSlider = createSlider('Pith Offset Y', log.options.cap.pithOffsetY, -0.8, 0.8, 0.01, (val) => {
    log.options.cap.pithOffsetY = val;
    onChange();
  });
  capSection.add(pithYSlider);
  controls.push({ control: pithYSlider, update: () => pithYSlider.setValue(log.options.cap.pithOffsetY) });

  const ringWobbleSlider = createSlider('Ring Wobble', log.options.cap.ringWobble, 0, 1, 0.01, (val) => {
    log.options.cap.ringWobble = val;
    onChange();
  });
  capSection.add(ringWobbleSlider);
  controls.push({ control: ringWobbleSlider, update: () => ringWobbleSlider.setValue(log.options.cap.ringWobble) });

  const crackCountSlider = createSlider('Cracks', log.options.cap.crackCount, 0, 8, 1, (val) => {
    log.options.cap.crackCount = val;
    onChange();
  });
  capSection.add(crackCountSlider);
  controls.push({ control: crackCountSlider, update: () => crackCountSlider.setValue(log.options.cap.crackCount) });

  const crackWidthSlider = createSlider('Crack Width', log.options.cap.crackWidth, 0.1, 2, 0.1, (val) => {
    log.options.cap.crackWidth = val;
    onChange();
  });
  capSection.add(crackWidthSlider);
  controls.push({ control: crackWidthSlider, update: () => crackWidthSlider.setValue(log.options.cap.crackWidth) });

  scrollArea.appendChild(capSection.element);

  // ----- Mesh Section -----
  const meshSection = createSection('Mesh', false);

  const sectionsSlider = createSlider('Sections', log.options.sections, 4, 64, 1, (val) => {
    log.options.sections = val;
    onChange();
  });
  meshSection.add(sectionsSlider);
  controls.push({ control: sectionsSlider, update: () => sectionsSlider.setValue(log.options.sections) });

  const segmentsSlider = createSlider('Segments', log.options.segments, 4, 32, 1, (val) => {
    log.options.segments = val;
    onChange();
  });
  meshSection.add(segmentsSlider);
  controls.push({ control: segmentsSlider, update: () => segmentsSlider.setValue(log.options.segments) });

  scrollArea.appendChild(meshSection.element);

  // ----- Stats HUD (top-left overlay) -----
  const hud = document.getElementById('stats-hud');
  hud.innerHTML = `<span id="hud-verts"></span><span id="hud-tris"></span>`;
  const hudVerts = document.getElementById('hud-verts');
  const hudTris = document.getElementById('hud-tris');

  container.appendChild(panel);

  function updateInfoDisplays() {
    hudVerts.textContent = `Verts: ${Math.round(log.vertexCount).toLocaleString()}`;
    hudTris.textContent = `Tris: ${Math.round(log.triangleCount).toLocaleString()}`;
  }

  function refreshAllControls() {
    controls.forEach(({ update }) => update());
    updateInfoDisplays();
  }

  updateInfoDisplays();

  const toggleBtn = header.querySelector('.panel-mobile-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      window.dispatchEvent(new Event('resize'));
    });
  }
}
