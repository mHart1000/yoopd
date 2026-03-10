document.addEventListener('keydown', function(event) {
	if (event.key === "]") {
		event.preventDefault()
		// find element on keypress to avoid a stale variable in youtube SPA
		document.querySelector('video').playbackRate += 0.25
	}
	if (event.key === '[') {
		event.preventDefault()
		const video = document.querySelector('video')
		// avoid speed going below 0.25
		video.playbackRate = Math.max(0.25, video.playbackRate - 0.25) 
	}
})