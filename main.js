// for infity craft (04.03.2024): recursivly keeps combining elements - in browser first switch to mobile view before executing
// also logs all combinations and their results and allows for downloading these results as a text file. 
// The process involves waiting for specific conditions (like class removal) to simulate realistic interaction and implements a priority system for elements, 
// although it notes that the priority functionality might not be working perfectly. 
// The Code can resume from a specific state if interrupted, using parameters like "already_processed_num" and "end" to specify a combination set and "skip" to start from a specific combination pair
// set minDelay for desired speed but be cautious not to flood server with request

// Object to store element priorities, e.g., {'Fire': 2, 'Water': 1}
let elementPriorities = {};

// Global flag to control the execution
let keepRunning = true;

// Minimum delay between actions to mimic human interaction
let min_delay = 5000; // set via setMinDelay(ms), min_delay below 300 can cause the server to deny acces for 1 hour 

// Tracks the elapsed time waiting for conditions to be met
let elapsed = 0;

// Skip N elements in the processing, useful for resuming or adjusting the flow
let skip = 0;

// String to accumulate text output, later used for download
let out_text = "";

// Function to trigger the download of `out_text` as a text file
function downloadTXT() {
	var text = out_text;
	var textBlob = new Blob([text], { type: 'text/plain' });

	// Create a link to download the Blob as a file
	var downloadLink = document.createElement("a");
	downloadLink.download = "MyTextFile.txt"; // Name of the file to be downloaded
	downloadLink.innerHTML = "Download File";

	// Create a URL for the Blob
	if (window.webkitURL != null) {
		// Chrome allows the link to be clicked programmatically
		downloadLink.href = window.webkitURL.createObjectURL(textBlob);
	} else {
		// Firefox requires adding the link to the DOM before a click can be simulated
		downloadLink.href = window.URL.createObjectURL(textBlob);
		downloadLink.onclick = destroyClickedElement;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	// Function to remove the link after clicking
	function destroyClickedElement(event) {
		// Remove the element from the DOM
		document.body.removeChild(event.target);
	}

	// Add event listener to remove the link after clicking
	downloadLink.addEventListener("click", destroyClickedElement, false);

	// Simulate a click on the link
	downloadLink.click();
}

// Function to wait for the right moment to initiate download
function waitForRightTimeToDownload() {
  // Checks every 50ms if `elapsed > 0`
  const checkInterval = setInterval(() => {
    if (elapsed > 0) {
      console.log("Optimal download timing found.");
      downloadTXT();
      clearInterval(checkInterval); // Stops the checking after download has started
    }
  }, 50);
}

// Sets up periodic downloads per hour, based on specified frequency
function startPeriodicDownloadPerHour(frequencePerHour=1) {
  setInterval(() => {
    console.log("Checking for automatic download.");
    waitForRightTimeToDownload();
  }, 3600000 / frequencePerHour); // 3600000 ms = 1 hour
}

// Function to append a combination result to `out_text`
function addTripleToOut(first, second, result){
	let out = first.split('-')[1]
	out += ","
	out += second.split('-')[1]	
	out += ","
	out += result.split('-')[1]
	out += "\n"
	out_text += out;
	console.log(out);
}

// Function to set the priority of an element
function setElementPriority(elementName, priority) {
  elementPriorities["item-" + elementName.toLowerCase()] = priority;
}

// Toggle the running state
function toggleRunning() {
  keepRunning = !keepRunning;
  console.log(keepRunning ? "Running" : "Stopped");
}

// Set the minimum delay between actions
function setMinDelay(ms) {
  min_delay = ms;
}

// Promise-based delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Waits for a class to be removed from an item, indicating readiness for next combination
async function waitForClassRemoval(item) {
  let result = null;
  elapsed = 0; // Reset elapsed time
  while (item.classList.contains('item-selected-mobile')) {
    await delay(50);
	if(result === null){
		result = document.querySelector('.mobile-item .item-crafted-mobile');
	}
    elapsed += 50; // Update elapsed time
  }
  if(result === null){
	result = document.querySelector('.mobile-item .item-crafted-mobile');
  }
  return result;
}

// Ensures a minimum delay has passed before proceeding
async function bufferdelay(){ 
  if (elapsed < min_delay) {
    await delay(min_delay - elapsed);
  }
  elapsed = 0;
}

// Main function to process item combinations with delays
async function clickItemsWithDelay(already_processed_num, end) {
  const originalItems = document.querySelectorAll('.mobile-item .item');
  
  if (end === 0) {
    end = originalItems.length;
  }
  
  let toProcessElements = Array.from(originalItems);
  let alreadyProcessed = toProcessElements.splice(0, already_processed_num);
  
  // Sort items by priority, defaulting to 1 if not set (not really thought through - probably messes up the order which causes some elements not to be combined)
  let prioritizedItems = toProcessElements.sort((a, b) => {
    let priorityA = elementPriorities[a.id.toLowerCase()] || 1;
    let priorityB = elementPriorities[b.id.toLowerCase()] || 1;
    return priorityB - priorityA;
  });
  
  let toProcessElementsPrioritized = [...prioritizedItems, ...alreadyProcessed];
  
  let new_elements_num = end - already_processed_num;
  
  for (let n = 0; n < new_elements_num && keepRunning; n++) {
    for (let m = n; m < end && keepRunning; m++) {
	  if(skip > 0){
	    m += skip; // one time skip to continue from specific m
		skip = 0;
	  }
      toProcessElementsPrioritized[n].click(); // Click on `item[n]`
      await delay(50 + Math.floor(Math.random() * 200));
      toProcessElementsPrioritized[m].click(); // Click on `item[m]`
      console.log(`Clicked item (${n},${m}) | (${toProcessElementsPrioritized[n].id},${toProcessElementsPrioritized[m].id})`);
      let resultEl = await waitForClassRemoval(toProcessElementsPrioritized[n]);
	  await bufferdelay();
      if (resultEl !== null) {
		addTripleToOut(toProcessElementsPrioritized[n].id, toProcessElementsPrioritized[m].id, resultEl.id);
      }
    }
  }
  // If new items are added during the process, continue with the new items
  if (originalItems.length < document.querySelectorAll('.mobile-item .item').length && keepRunning) {
    clickItemsWithDelay(originalItems.length, 0);
  }
}
