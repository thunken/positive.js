(function ( $ ) {

    $.fn.positive = function( options ) {

        if (this.length > 1) {
            throw new Error('You cannot instanciate Positive.js on multiple buttons.');
        }

        var settings = $.extend({
            // Default settings
            canvasStyle: {
                maxWidth: '100%'
            },
            modalId: 'feedback-modal',
            formId: 'feedback-form',
            screenshotCheckBoxId: 'screenshot-checkbox',
            locationCheckBoxId: 'location-checkbox',
            screenshotPlaceholderId: 'screenshot-placeholder',

            showLoader: function (previewElement) {
                previewElement.prepend($('<div class="sk-three-bounce"> \
                                    <div class="sk-child sk-bounce1"></div> \
                                    <div class="sk-child sk-bounce2"></div> \
                                    <div class="sk-child sk-bounce3"></div> \
                                  </div>')
                );
            },
            hideLoader: function (previewElement) {
                previewElement.children('.sk-three-bounce').remove();
            },

            onScreenshotLoad:  function () {},
            onScreenshotLoaded: function() {},
            onSubmitSuccess: function (modal, data) {
                // Closing modal on success
                modal.modal('hide');
            },
            onSubmitError: function (modal, error) {
                modal.modal('hide');
                window.alert('An error occured, please try again later');
            }
        }, $.fn.positive.defaults, options);

        // Setting some private variables
        var canvasCache = null;
        var browserInfoCache = null;
        var targetUrl = null;

        var $feedbackButton = this;
        var $feedBackModal = $('#' + settings.modalId);
        var $form = $('#' + settings.formId, $feedBackModal);
        var $screenshotCheckbox = $('#' + settings.screenshotCheckBoxId, $form);
        var $locationCheckbox = $('#' + settings.locationCheckBoxId, $form);
        var $screenshotPlaceholder = $('#' + settings.screenshotPlaceholderId, $feedBackModal);

        var previewSelector = '.preview';

        // Handling screenshot when checkbox value changes
        $screenshotCheckbox.bind('change', function (event) {
            var $checkbox = $(this);
            var $preview = $(previewSelector, $screenshotPlaceholder);

            if ($checkbox.is(':checked')) {
                if (canvasCache !== null) {
                    $preview.html(canvasCache);
                }
            } else {
                $preview.empty();
            }
        });

        // Handling location when checkbox value changes
        $locationCheckbox.bind('change', function (event) {
            var $checkbox = $(this);
            var denizen = new Denizen();

            if ($checkbox.is(':checked')) {
                denizen = new Denizen({
                    afterLocationSet: function (data) {
                        browserInfoCache = data;
                    }
                });
                denizen.setLocation();
            } else {
                browserInfoCache = denizen.getData();
            }
        });

        // Handling form submission
        $form.on('submit', function (event) {
            event.preventDefault();

            var $preview = $(previewSelector, $screenshotPlaceholder);
            var $form = $(this);

            var canvasData = null;
            if ($screenshotCheckbox.is(':checked') && ($('canvas', $preview).length > 0)) {
                canvasData = $('canvas', $preview)[0].toDataURL();
            }

            var data = $.map({
                browser: JSON.stringify(browserInfoCache),
                image: canvasData,
                form: $form.serialize()
            }, function(element, name) {
                return name + '=' + element;
            }).join('&');

            $.ajax({
                url: targetUrl,
                type: 'post',
                dataType: 'json',
                success: function (data) {
                    settings.onSubmitSuccess($feedBackModal, data);
                },
                error: function (error) {
                    settings.onSubmitError($feedBackModal, error);
                },
                data: data
            });
        });

        // Handling click on the feedback button
        this.bind('click', function (event) {
            targetUrl = $feedbackButton.data('target-url');
            $feedBackModal.modal();
        });

        $feedBackModal.bind('shown.modal.bs', function() {
            $('.modal-backdrop').data('html2canvas-ignore', true);
            $('.modal-backdrop').attr('data-html2canvas-ignore', true);

            var denizen = new Denizen();
            browserInfoCache = denizen.getData();

            // We cache the screenshot on the first feedback modal display
            cacheCanvas(function(canvas) {
                $(canvas).css(settings.canvasStyle);
                canvasCache = canvas;
                $screenshotCheckbox.change();
            });
        });

        // Handling modal when it closes
        $feedBackModal.bind('hidden.modal.bs', function() {
            // Resetting form on close
            $form[0].reset();
        });

        /**
         * Generate and cache the screenshot in a var
         *
         * @function callback
         */
        var cacheCanvas = function (callback) {
            if (canvasCache === null) {
                settings.onScreenshotLoad();
                settings.showLoader($(previewSelector, $screenshotPlaceholder));
                html2canvas(document.body, {
                    onrendered: function (canvas) {
                        callback(canvas);
                        settings.onScreenshotLoaded();
                        settings.hideLoader($(previewSelector, $screenshotPlaceholder));
                    },
                    width: window.screen.availWidth,
                    height: window.screen.availHeight
                });
            }
        };

        return this;
    };

}( jQuery ));