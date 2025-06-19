const canvases = [
	{ id: 'canvas1', lambda: 1, dynamic: false },
	{ id: 'canvas2', lambda: 0.5, dynamic: true },
	{ id: 'canvas3', lambda: 0, dynamic: false },
];

let points = [];
const canvasObjects = [];

const viridis = [
	[68, 1, 84],
	[69, 22, 103],
	[71, 44, 122],
	[65, 62, 130],
	[59, 81, 139],
	[51, 97, 140],
	[44, 113, 142],
	[39, 128, 141],
	[33, 144, 141],
	[36, 158, 135],
	[39, 173, 129],
	[65, 186, 114],
	[92, 200, 99],
	[131, 210, 74],
	[170, 220, 50],
	[211, 226, 44],
	[253, 231, 37],
];

const LUT_SIZE = 1000;
const colorLUT = new Array(LUT_SIZE);

function buildColorLUT() {
	for(let i=0; i<LUT_SIZE; i++) {
		const v = i/(LUT_SIZE-1) * 2 - 1;
		colorLUT[i] = getColorFromValueOriginal(v);
	}
}

function getColorFromValueOriginal(v) {
	v = Math.max(0, Math.min(1, (v + 1) / 2));
	const a = 100;
	const b = 20;
	const idxDisc = Math.min(viridis.length - 1, Math.floor(v * viridis.length));
	const g = viridis[idxDisc];
	const scaled = v * (viridis.length - 1);
	const idxInterp = Math.floor(scaled);
	const t = scaled - idxInterp;
	const c1 = viridis[idxInterp];
	const c2 = viridis[Math.min(idxInterp + 1, viridis.length - 1)];
	const f = [
		(1 - t) * c1[0] + t * c2[0],
		(1 - t) * c1[1] + t * c2[1],
		(1 - t) * c1[2] + t * c2[2]
	];
	const result = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		const fx = Math.max(1e-6, f[i]);
		const gx = Math.max(1e-6, g[i]);
		const avg = (Math.floor(gx) + Math.ceil(gx)) / 2;
		const mix = Math.pow(fx ** (a - b) * avg ** b, 1 / a) * Math.sign(gx);
		result[i] = Math.round(mix);
	}
	return result;
}

function getColorFromValueFast(v) {
	v = Math.max(-1, Math.min(1, v));
	const idx = Math.floor(((v + 1) / 2) * (LUT_SIZE - 1));
	return colorLUT[idx];
}

buildColorLUT();

canvases.forEach(({ id, lambda, dynamic }) => {
	const canvas = document.getElementById(id);
	const ctx = canvas.getContext('2d');

	function draw() {

		let currentLambda = lambda;
		if (dynamic) {
			const slider = document.getElementById("lambdaSlider");
			currentLambda = parseFloat(slider.value);
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const imageData = ctx.createImageData(canvas.width, canvas.height);

		for (let y = 0; y < canvas.height; y++) {
			for (let x = 0; x < canvas.width; x++) {
				const idx = (y * canvas.width + x) * 4;
				let val = 0;

				for (let p of points) {
					const dx = p.x - x;
					const dy = p.y - y;
					const dist2 = dx * dx + dy * dy;

					const linearTerm = p.sign * (p.x * x + p.y * y) / (canvas.width * canvas.height);
					const kernelTerm = p.sign * Math.exp(-dist2 / (5000 * (1 - currentLambda + 0.01)));

					val += currentLambda * linearTerm + (1 - currentLambda) * kernelTerm;
				}

				val = Math.max(-1, Math.min(1, val)); // clamp to [-1, 1]
				const [r, g, b] = getColorFromValueFast(val);
				imageData.data[idx] = r;
				imageData.data[idx + 1] = g;
				imageData.data[idx + 2] = b;
				imageData.data[idx + 3] = 255;
			}
		}

		ctx.putImageData(imageData, 0, 0);

		for (let p of points) {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
			ctx.fillStyle = p.sign === 1 ? "red" : "blue";
			ctx.fill();
			ctx.strokeStyle = "white";
			ctx.stroke();
		}

	}

	canvas.addEventListener('mousedown', (e) => {
		e.preventDefault(); // empêche menu contextuel
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const sign = e.button === 2 ? -1 : 1;
		points.push({ x, y, sign });
		redrawAll();
	});

	canvas.addEventListener('contextmenu', (e) => e.preventDefault());

	canvasObjects.push({ canvas, draw });
});

function redrawAll() {
	canvasObjects.forEach(({ draw }) => draw());
}

redrawAll();

document.getElementById("lambdaSlider").addEventListener("input", (e) => {
	document.getElementById("lambdaValue").textContent = parseFloat(e.target.value).toFixed(2);
	redrawAll();
});
