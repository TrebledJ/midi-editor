
// Currently selected basic operation
var currentBasicOp = "no-op";

// Currently selected base layer operation
var currentBaseLayerOp = "no-op";

// Currently selected shade layer operation
var currentShadeLayerOp = "no-op";

// Currently selected outline layer operation
var currentOutlineLayerOp = "no-op";

// Event handler for the 'click' event of the tabs
// The main goal of this handler is to improve the user experience by adding
// the behaviour of switching tab when the tab is clicked, in additional to
// the default behaviour which switch the tab only when the drop down menu
// items are clicked
function showTab(e) {
    // The target is the 'tab', i.e. the <li>. But most of the time the event
    // is triggered from the <a> inside it, due to the area occupied is much
    // bigger and hence easier to be clicked. So we need to adjust the 'target'
    // if it is not what we want.
    var target = $(e.target);

    // Check if 'target' is actually a <li> element. If not, we need to
    // find the <li> that is a parent of the current selected element.
    if (target.prop("tagName") !== "LI") {
        target = target.parents("li");
    }

    // Find the drop down menu item of this tab that is currently selected
    switch (target.attr("id")) {
        case "basic-dropdown":
            target = target.find("ul li a[href='#" + currentBasicOp + "']");
            break;
        case "base-dropdown":
            target = target.find("ul li a[href='#" + currentBaseLayerOp + "']");
            break;
        case "shade-dropdown":
            target = target.find("ul li a[href='#" + currentShadeLayerOp + "']");
            break;
        case "outline-dropdown":
            target = target.find("ul li a[href='#" + currentOutlineLayerOp + "']");
            break;
    }

    // Show the tab and make the tab active
    target.trigger('click');
}

// Event handler for the 'click' event of the tab dropdown items.
// This event handler is executed when a dropdown item is clicked on.
function changeTabs(e) {
    // The target is the drop down menu item of the tab
    var target = $(e.target);

    // Check if 'target' is actually an <a> element. If not, we need to
    // find the <a> that is a parent of the current selected element.
    if (target.prop("tagName") !== "A") {
        target = target.parents("a");
    }

    // Show the tab and make the tab active
    target.tab('show');
    target.toggleClass("active");
    target.parents(".nav-item").find(".nav-link").toggleClass("active");

    // Change the tab title to relect which waveform is selected
    target.parents("li").find("span.title").html(target.html());

    // Change the current operation in different tab
    switch (target.parents("li.dropdown").attr("id")) {
        case "basic-dropdown":
            currentBasicOp = target.attr("href").substring(1);
            break;
        case "base-dropdown":
            currentBaseLayerOp = target.attr("href").substring(1);
            break;
        case "shade-dropdown":
            currentShadeLayerOp = target.attr("href").substring(1);
            break;
        case "outline-dropdown":
            currentOutlineLayerOp = target.attr("href").substring(1);
            break;
    }

    e.preventDefault();
}

// Set up every things when the document is fully loaded
$(document).ready(function() {
    // Initialize the imageproc module.
    // Get ready for the canvas area and automatically load the input image
    imageproc.init("input", "output", "input-image");

    // Update the input image when the selection is changed
    $("#input-image").on("change", function() { imageproc.updateInputImage(); });

    // Update button to apply all image processing functions
    $("#output-update").on("click", function() { imageproc.apply(); });
    
    // Enable Bootstrap Toggle
    $("input[type=checkbox]").bootstrapToggle();

    // Set up the event handlers
    $('a.nav-link').on("click", showTab); // Tab clicked
    $('a.dropdown-item').on("click", changeTabs); // Tab item clicked
});
