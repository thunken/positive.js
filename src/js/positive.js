(function ( $ ) {

    $.fn.positive = function( options ) {

        if (this.length > 1) {
            throw new Error('You cannot instantiate Positive.js on multiple buttons.');
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

            /**
             * This function is executed when right before the screenshot canvas is generated
             *
             * @param previewElement
             */
            showLoader: function (previewElement) {
                previewElement.prepend($('<div class="sk-three-bounce"> \
                                    <div class="sk-child sk-bounce1"></div> \
                                    <div class="sk-child sk-bounce2"></div> \
                                    <div class="sk-child sk-bounce3"></div> \
                                  </div>')
                );
            },

            /**
             * This function is executed when right after the screenshot canvas is generated
             *
             * @param previewElement
             */
            hideLoader: function (previewElement) {
                previewElement.children('.sk-three-bounce').remove();
            },

            /**
             * Add some magic before the screenshot is generated
             */
            onScreenshotLoad:  function () {},

            /**
             * Add some magic after the screenshot is generated
             */
            onScreenshotLoaded: function() {},

            /**
             * This function is called right before the form is submitted
             *
             * @param modal
             * @param data
             */
            onFormSubmit: function (modal, form) {},

            /**
             * This function is called right after the form is submitted and the server replied
             *
             * @param modal
             * @param data
             */
            onFormSubmitted: function (modal, form) {
                // Closing modal once form submitted
                modal.modal('hide');
            },

            /**
             * This function is called when the form has been submitted and the server responded successfully
             *
             * @param modal
             * @param data
             */
            onSubmitSuccess: function (modal, data) {},

            /**
             * This function is called when the form has been submitted but the server responded with an error
             *
             * @param modal
             * @param error
             */
            onSubmitError: function (modal, error) {
                // User has to know an error occured
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
            if ($screenshotCheckbox.is(':checked') && canvasCache !== null) {
                canvasData = canvasCache.toDataURL("image/png");
            }

            var data = $.map({
                browser: JSON.stringify(browserInfoCache),
                image: canvasData
            }, function(element, name) {
                return name + '=' + element;
            }).join('&');

            data = data + '&' + $form.serialize();

            settings.onFormSubmit($feedBackModal, $form);

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
            }).always(function (){
                settings.onFormSubmitted($feedBackModal, $form);
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
                    width: window.screen.availWidth,
                    height: window.screen.availHeight
                }).then(function (canvas) {
                       callback(canvas);
                       settings.onScreenshotLoaded();
                       settings.hideLoader($(previewSelector, $screenshotPlaceholder));
                });
            }
        };

        return this;
    };

}( jQuery ));
