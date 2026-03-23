function showSpeedIndicator(speed) {
	let indicator = document.getElementById('yoopd-speed-indicator')

	if (!indicator) {
		indicator = document.createElement('div')
		indicator.id = 'yoopd-speed-indicator'
		indicator.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: rgba(0, 0, 0, 0.5);
			color: white;
			padding: 12px 20px;
			border-radius: 8px;
			font-size: 24px;
			font-weight: bold;
			font-family: Arial, sans-serif;
			z-index: 9999;
			transition: opacity 0.3s ease;
			pointer-events: none;
		`
		document.body.appendChild(indicator)
	}

	indicator.textContent = `${speed.toFixed(2)}x`
	indicator.style.opacity = '1'

	// Clear any existing timeout
	if (indicator.hideTimeout) {
		clearTimeout(indicator.hideTimeout)
	}

	// Fade out after 1.5 seconds
	indicator.hideTimeout = setTimeout(() => {
		indicator.style.opacity = '0'
	}, 1500)
}

document.addEventListener('keydown', function(event) {
	if (event.key === "]") {
		event.preventDefault()
		// find element on keypress to avoid a stale variable in youtube SPA
		const video = document.querySelector('video')
		video.playbackRate += 0.25
		// Update speed in YouTube's UI
		video.dispatchEvent(new Event('ratechange'))
		showSpeedIndicator(video.playbackRate)
	}
	if (event.key === '[') {
		event.preventDefault()
		const video = document.querySelector('video')
		// avoid speed going below 0.25
		video.playbackRate = Math.max(0.25, video.playbackRate - 0.25)
		video.dispatchEvent(new Event('ratechange'))
		showSpeedIndicator(video.playbackRate)
	}
})
