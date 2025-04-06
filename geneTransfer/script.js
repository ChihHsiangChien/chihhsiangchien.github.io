document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step');
    const nextStepButton = document.getElementById('next-step-button');
    const resetButton = document.getElementById('reset-button');
    const instructionsP = document.getElementById('instructions');
    const feedbackP = document.getElementById('feedback');

    // Draggable items and Dropzones references (will be populated as needed)
    let dragItems = document.querySelectorAll('.drag-item');
    let dropzones = document.querySelectorAll('.dropzone');

    // Game State Variables
    let currentStep = 1;
    let gameState = {
        humanDnaCollected: false,
        plasmidCollected: false,
        humanDnaCut: false,
        plasmidCut: false,
        geneIsolated: false, // Implicitly true when humanDnaCut is true
        geneLigated: false,
        plasmidOpened: false, // Implicitly true when plasmidCut is true
        transformed: false,
        cultured: false,
        purified: false
    };

    // --- Utility Functions ---
    function updateUI() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', (index + 1) === currentStep);
            step.classList.toggle('hidden', (index + 1) !== currentStep);
        });

        // Enable/Disable Next Step Button based on current step completion
        nextStepButton.disabled = !isStepComplete(currentStep);

        // Update instructions based on current step
        updateInstructions();

        // Re-query dynamic elements like dropzones/drag-items if needed when steps change
        dragItems = document.querySelectorAll('.drag-item');
        dropzones = document.querySelectorAll('.dropzone');
        addDragDropListeners(); // Re-attach listeners
    }

    function displayFeedback(message, isSuccess = true) {
        feedbackP.textContent = message;
        feedbackP.style.color = isSuccess ? '#28a745' : '#dc3545'; // Green or Red
        // Clear feedback after a delay
        setTimeout(() => { feedbackP.textContent = ''; }, 3000);
    }

    function updateInstructions() {
         // Instructions are largely static in the HTML, but could be dynamic
         const currentInstructions = steps[currentStep - 1]?.querySelector('h2 + p');
         if (currentInstructions) {
             instructionsP.textContent = currentInstructions.textContent;
         } else {
             instructionsP.textContent = "請依照畫面指示操作。"; // Default
         }
    }

    function isStepComplete(step) {
        switch (step) {
            case 1: return gameState.humanDnaCollected && gameState.plasmidCollected;
            case 2: return gameState.humanDnaCut && gameState.plasmidCut;
            case 3: return gameState.geneLigated;
            case 4: return gameState.transformed;
            case 5: return gameState.cultured;
            case 6: return gameState.purified;
            default: return false;
        }
    }

    function goToNextStep() {
        if (isStepComplete(currentStep)) {
            currentStep++;
            if (currentStep > steps.length) {
                // Game finished
                instructionsP.textContent = "恭喜！您已成功模擬製造人類胰島素的過程！";
                feedbackP.textContent = "";
                nextStepButton.disabled = true;
                 // Maybe show a final success message or animation
                const purifiedInsulin = document.getElementById('purified-insulin');
                if(purifiedInsulin) purifiedInsulin.classList.remove('hidden');

            } else {
                updateUI();
                displayFeedback(`進入步驟 ${currentStep}`, true);
            }
        } else {
            displayFeedback("請先完成目前步驟的所有操作！", false);
        }
    }

    function resetGame() {
        currentStep = 1;
        gameState = {
            humanDnaCollected: false, plasmidCollected: false,
            humanDnaCut: false, plasmidCut: false,
            geneIsolated: false, geneLigated: false, plasmidOpened: false,
            transformed: false, cultured: false, purified: false
        };

        // Reset UI elements to initial state
        // Step 1 reset
        document.getElementById('human-dna-visual')?.classList.add('hidden');
        document.getElementById('plasmid-visual')?.classList.add('hidden');
        document.getElementById('human-cell-source')?.classList.remove('hidden');
        document.getElementById('bacteria-source')?.classList.remove('hidden');

        // Step 2 reset
        document.getElementById('human-dna-target')?.classList.remove('cut');
        document.getElementById('plasmid-target')?.classList.remove('cut');
        document.getElementById('insulin-gene')?.classList.add('hidden');
        document.getElementById('restriction-enzyme')?.classList.remove('hidden'); // Ensure enzyme is visible

        // Step 3 reset
        document.getElementById('isolated-gene-draggable')?.classList.add('hidden'); // Should be hidden initially in step 3
        document.getElementById('opened-plasmid-target')?.classList.remove('hidden'); // Show opened plasmid
        document.getElementById('ligase-button')?.classList.add('hidden');
        document.getElementById('recombinant-plasmid')?.classList.add('hidden');

        // Step 4 reset
         document.getElementById('recombinant-plasmid-draggable')?.classList.add('hidden'); // Hide draggable plasmid
         document.getElementById('bacteria-target')?.classList.remove('hidden'); // Show target bacteria
         document.getElementById('transformed-bacteria')?.classList.add('hidden');

         // Step 5 reset
         const btnCulture = document.getElementById('culture-button');
         if (btnCulture) {
            btnCulture.disabled = false;
         }
         document.getElementById('fermenter')?.classList.add('hidden');
         const progress = document.querySelector('#fermenter .progress');
         if(progress) progress.style.width = '0%';


         // Step 6 reset
         const btnPurify = document.getElementById('purify-button');
         if (btnPurify) {
            btnPurify.disabled = false;
         }         
         //document.getElementById('purify-button')?.disabled = false;
         document.getElementById('purified-insulin')?.classList.add('hidden');
         document.getElementById('producing-bacteria')?.classList.remove('hidden'); // Show bacteria again


        feedbackP.textContent = "";
        updateUI();
         displayFeedback("遊戲已重設", true);
    }


    // --- Drag and Drop Logic ---
    let draggedItem = null;

    function handleDragStart(e) {
        // Check if the item should be draggable in the current state
        if (e.target.classList.contains('drag-item') && !e.target.classList.contains('disabled')) {
            draggedItem = e.target;
            e.dataTransfer.setData('text/plain', draggedItem.id); // Set data
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => { // Make item semi-transparent during drag
                 draggedItem.style.opacity = '0.5';
            }, 0);
            // console.log('Dragging:', draggedItem.id, 'Type:', draggedItem.dataset.type); // Debug
        } else {
            e.preventDefault(); // Prevent dragging disabled items
        }
    }


    function handleDragEnd(e) {
        if (draggedItem) {
            draggedItem.style.opacity = '1'; // Restore opacity
            draggedItem = null;
        }
         // Clean up hover effects on dropzones
         dropzones.forEach(zone => zone.classList.remove('hover'));
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        if (e.target.classList.contains('dropzone')) {
             e.target.classList.add('hover'); // Add visual feedback
        }
    }

    function handleDragLeave(e) {
        if (e.target.classList.contains('dropzone')) {
            e.target.classList.remove('hover'); // Remove visual feedback
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (e.target.classList.contains('dropzone') && draggedItem) {
            e.target.classList.remove('hover');
            const droppedItemId = e.dataTransfer.getData('text/plain');
            const droppedItemElement = document.getElementById(droppedItemId); // Get the actual dragged element
            const draggedType = droppedItemElement?.dataset.type;
            const dropzoneId = e.target.id;
            const dropzoneTarget = e.target.dataset.target || e.target.parentElement?.dataset.target || dropzoneId; // For nested targets like cut sites

            // console.log(`Dropped ${draggedType} (${droppedItemId}) onto ${dropzoneId} (Target: ${dropzoneTarget})`); // Debug

            // --- Step-specific Drop Logic ---
            if (currentStep === 1 && dropzoneId === 'step1-dropzone') {
                handleStep1Drop(draggedType, droppedItemElement);
            }
             else if (currentStep === 2 && draggedType === 'enzyme') {
                 handleStep2Drop(dropzoneTarget, droppedItemElement);
             }
             else if (currentStep === 3 && draggedType === 'gene' && dropzoneTarget.includes('plasmid')) { // Target opened plasmid gap
                 handleStep3GeneDrop(droppedItemElement, e.target);
             }
            else if (currentStep === 4 && draggedType === 'recombinant-plasmid' && dropzoneId === 'bacteria-target') {
                 handleStep4Drop(droppedItemElement, e.target);
            }
            // Add more steps as needed

            // Update UI after potential state change
             updateUI();

        } else {
             displayFeedback("無效的操作或放置位置！", false);
        }
         if (draggedItem) { // Ensure opacity is reset even on invalid drop
             draggedItem.style.opacity = '1';
             draggedItem = null;
         }
    }

     // --- Step Handler Functions ---

     function handleStep1Drop(type, itemElement) {
        const humanDnaVisual = document.getElementById('human-dna-visual');
        const plasmidVisual = document.getElementById('plasmid-visual');

        if (type === 'human-cell' && !gameState.humanDnaCollected) {
            humanDnaVisual.classList.remove('hidden');
            itemElement.classList.add('hidden'); // Hide source
            gameState.humanDnaCollected = true;
            displayFeedback("已取得人類 DNA！", true);
        } else if (type === 'bacteria' && !gameState.plasmidCollected) {
            plasmidVisual.classList.remove('hidden');
            itemElement.classList.add('hidden'); // Hide source
            gameState.plasmidCollected = true;
            displayFeedback("已取得細菌質體！", true);
        } else {
             displayFeedback("已經有這個了，或者放錯了！", false);
        }
     }

     function handleStep2Drop(targetType, enzymeElement) {
         const dnaTarget = document.getElementById('human-dna-target');
         const plasmidTarget = document.getElementById('plasmid-target');
         const insulinGene = document.getElementById('insulin-gene');

         if (targetType === 'human-dna' && !gameState.humanDnaCut) {
             dnaTarget.classList.add('cut'); // Visual cue for cut
             insulinGene.classList.remove('hidden'); // Show the 'cut out' gene
              // Optionally, make the gene draggable for the next step AFTER cut
              // We will create a separate draggable gene in step 3 for clarity
             gameState.humanDnaCut = true;
             gameState.geneIsolated = true; // Mark gene as isolated
             displayFeedback("已切割人類 DNA，分離出胰島素基因！", true);
         } else if (targetType === 'plasmid' && !gameState.plasmidCut) {
             plasmidTarget.classList.add('cut'); // Visual cue for cut
             gameState.plasmidCut = true;
             gameState.plasmidOpened = true; // Mark plasmid as opened
             displayFeedback("已切割質體！", true);
         } else {
             displayFeedback("已經切過了，或放錯位置！", false);
         }

          // Maybe hide enzyme after use? Or allow multiple uses? For simplicity, hide after both cuts.
         if (gameState.humanDnaCut && gameState.plasmidCut) {
              enzymeElement.classList.add('hidden'); // Hide enzyme tool
              // Prepare Step 3 visuals
              document.getElementById('isolated-gene-draggable')?.classList.remove('hidden');
              document.getElementById('opened-plasmid-target')?.classList.remove('hidden');
              // Hide Step 2 targets if desired, or leave them
         }
     }

     function handleStep3GeneDrop(geneElement, dropTarget) {
         if (!gameState.geneLigated) {
             // Make the gene visually appear in the plasmid gap (or near it)
             // For simplicity, we'll just hide the draggable gene and show the ligase button
             geneElement.classList.add('hidden'); // Hide the draggable gene
             // Optionally add a visual cue inside the plasmid gap before ligation
             document.querySelector('#opened-plasmid-target .plasmid-gap').textContent = "基因已放入";

             // Show the ligase button
             document.getElementById('ligase-button').classList.remove('hidden');
             displayFeedback("基因已放入質體，請使用連接酶！", true);

             // Note: gameState.geneLigated is set when the button is clicked
         }
     }

      function handleLigaseClick() {
          if(gameState.plasmidOpened && gameState.geneIsolated && !gameState.geneLigated) {
               gameState.geneLigated = true;
               displayFeedback("DNA 連接酶作用，重組質體完成！", true);

               // Update visuals: hide opened plasmid, show recombinant plasmid
               document.getElementById('opened-plasmid-target').classList.add('hidden');
               document.getElementById('ligase-button').classList.add('hidden');
               document.getElementById('recombinant-plasmid').classList.remove('hidden');

                // Prepare step 4: make the new plasmid draggable
                const recombPlasmidDraggable = document.getElementById('recombinant-plasmid-draggable');
                if (recombPlasmidDraggable) {
                     // Copy visual from the static one if needed, or assume it's already styled
                     recombPlasmidDraggable.innerHTML = document.getElementById('recombinant-plasmid').innerHTML;
                     recombPlasmidDraggable.classList.remove('hidden'); // Show draggable version for next step
                }
                document.getElementById('recombinant-plasmid').classList.add('hidden'); // Hide static version


               updateUI(); // Check if step 3 is now complete
          }
      }


      function handleStep4Drop(plasmidElement, bacteriaTarget) {
           if (!gameState.transformed) {
               gameState.transformed = true;
               displayFeedback("轉殖成功！質體已進入細菌。", true);

               // Update visuals
               plasmidElement.classList.add('hidden'); // Hide draggable plasmid
               bacteriaTarget.classList.add('hidden'); // Hide original bacteria target
               document.getElementById('transformed-bacteria').classList.remove('hidden'); // Show transformed bacteria

               updateUI(); // Check if step 4 is now complete
           }
      }

      function handleCultureClick() {
           if (!gameState.cultured) {
                displayFeedback("開始培養細菌...", true);
                document.getElementById('culture-button').disabled = true; // Prevent re-click
                 document.getElementById('petri-dish').classList.add('hidden'); // Hide petri dish visual

                const fermenter = document.getElementById('fermenter');
                const progressBar = fermenter.querySelector('.progress');
                fermenter.classList.remove('hidden');

                // Simulate growth with progress bar
                progressBar.style.width = '100%';

                // After animation completes (match CSS transition duration)
                setTimeout(() => {
                     gameState.cultured = true;
                     displayFeedback("細菌培養完成！", true);
                     // Optionally hide fermenter progress bar after completion if desired
                     // progressBar.parentElement.style.opacity = 0.5; // Example fade
                     updateUI(); // Check if step 5 is complete
                }, 2100); // A bit longer than CSS transition
           }
      }

      function handlePurifyClick() {
          if (!gameState.purified && gameState.cultured) { // Ensure cultured first
              gameState.purified = true;
              displayFeedback("開始純化胰島素...", true);
               document.getElementById('purify-button').disabled = true; // Prevent re-click
               document.getElementById('producing-bacteria').classList.add('hidden'); // Hide bacteria

              // Simulate purification (could be an animation)
              // For now, just show the final product after a short delay
              setTimeout(() => {
                  document.getElementById('purified-insulin').classList.remove('hidden');
                  displayFeedback("成功獲得純化的人類胰島素！", true);
                  updateUI(); // Check if step 6 is complete (and game ends)
                  goToNextStep(); // Trigger game completion check
              }, 1500);
          }
      }


    // --- Event Listeners Setup ---
    function addDragDropListeners() {
        // Remove existing listeners to prevent duplicates if called multiple times
         dragItems.forEach(item => {
             item.removeEventListener('dragstart', handleDragStart);
             item.removeEventListener('dragend', handleDragEnd);
             item.addEventListener('dragstart', handleDragStart);
             item.addEventListener('dragend', handleDragEnd);
         });

         dropzones.forEach(zone => {
             zone.removeEventListener('dragover', handleDragOver);
             zone.removeEventListener('dragleave', handleDragLeave);
             zone.removeEventListener('drop', handleDrop);
             zone.addEventListener('dragover', handleDragOver);
             zone.addEventListener('dragleave', handleDragLeave);
             zone.addEventListener('drop', handleDrop);
         });
    }

    // Button Listeners
    nextStepButton.addEventListener('click', goToNextStep);
    resetButton.addEventListener('click', resetGame);

    // Step-specific Button Listeners (find them within their steps)
    const ligaseButton = document.getElementById('ligase-button');
    if (ligaseButton) ligaseButton.addEventListener('click', handleLigaseClick);

    const cultureButton = document.getElementById('culture-button');
    if (cultureButton) cultureButton.addEventListener('click', handleCultureClick);

     const purifyButton = document.getElementById('purify-button');
    if (purifyButton) purifyButton.addEventListener('click', handlePurifyClick);


    // --- Initial Setup ---
    updateUI(); // Set the initial view to Step 1

}); // End DOMContentLoaded