    // Global variable to track last shown error (to prevent duplicate modals)
    var lastApiErrorShown = '';

    /**
     * Show a universal modal with customizable content
     * @param {Object} options - Modal configuration
     * @param {string} options.type - Modal type: 'error', 'success', 'info', 'warning' (default: 'info')
     * @param {string} options.title - Modal title
     * @param {string|HTMLElement} options.content - Modal body content (HTML string or element)
     * @param {string} options.icon - Optional SVG icon path (defaults based on type)
     */
    function showUniversalModal(options) {
        options = options || {};
        var type = options.type || 'info';
        var title = options.title || 'Notice';
        var content = options.content || '';

        var overlay = document.getElementById('universal-modal-overlay');
        if (!overlay) {
            console.error('Modal overlay not found!');
            return;
        }

        var header = overlay.querySelector('.universal-modal-header');
        var titleEl = overlay.querySelector('.universal-modal-header h3');
        var bodyEl = overlay.querySelector('.universal-modal-body');
        var iconEl = overlay.querySelector('.universal-modal-header h3 svg path');

        // Set modal type
        header.className = 'universal-modal-header type-' + type;

        // Set title
        if (titleEl) {
            var textNode = titleEl.childNodes[titleEl.childNodes.length - 1];
            if (textNode && textNode.nodeType === 3) {
                textNode.textContent = title;
            } else {
                titleEl.appendChild(document.createTextNode(title));
            }
        }

        // Set icon based on type
        if (iconEl && options.icon) {
            iconEl.setAttribute('d', options.icon);
        } else if (iconEl) {
            var defaultIcons = {
                error: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
                success: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
                info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
                warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'
            };
            iconEl.setAttribute('d', defaultIcons[type] || defaultIcons.info);
        }

        // Set content
        if (bodyEl) {
            if (typeof content === 'string') {
                bodyEl.innerHTML = content;
            } else {
                bodyEl.innerHTML = '';
                bodyEl.appendChild(content);
            }
        }

        overlay.classList.add('visible');

        // Close on escape key
        document.addEventListener('keydown', handleModalEscapeKey);
        overlay.addEventListener('click', handleModalOverlayClick);
    }

    function closeUniversalModal() {
        var overlay = document.getElementById('universal-modal-overlay');
        if (!overlay) return;
        overlay.classList.remove('visible');
        document.removeEventListener('keydown', handleModalEscapeKey);
        overlay.removeEventListener('click', handleModalOverlayClick);
        // Reset the last error shown so the modal can appear again for the same error
        lastApiErrorShown = '';
    }

    function handleModalEscapeKey(e) {
        if (e.key === 'Escape') {
            closeUniversalModal();
        }
    }

    function handleModalOverlayClick(e) {
        if (e.target === document.getElementById('universal-modal-overlay')) {
            closeUniversalModal();
        }
    }

    // Backward compatibility: API Error Modal Functions
    function showApiErrorModal(url, responseCode, responseBody, responseHeaders, hint) {
        // Count items in response body
        var itemCount = '';
        try {
            var parsed = JSON.parse(responseBody);
            if (Array.isArray(parsed)) {
                itemCount = ' (' + parsed.length + ')';
            } else if (typeof parsed === 'object' && parsed !== null) {
                itemCount = ' (object)';
            }
        } catch(e) {}

        var content = '<div class="modal-detail">' +
            '<div class="modal-detail-label">Request URL</div>' +
            '<div class="modal-detail-value">' + (url || 'N/A') + '</div>' +
            '</div>' +
            '<div class="modal-detail">' +
            '<div class="modal-detail-label">Response Body' + itemCount + '</div>' +
            '<pre class="modal-detail-value error-message">' + (responseBody || 'No response body') + '</pre>' +
            '</div>' +
            '<div class="modal-detail">' +
            '<div class="modal-detail-label">Response Code</div>' +
            '<div class="modal-detail-value error-message">' + (responseCode || 'N/A') + '</div>' +
            '</div>' +
            '<div class="modal-detail">' +
            '<div class="modal-detail-label">Response Headers</div>' +
            '<pre class="modal-detail-value">' + (responseHeaders || 'No headers') + '</pre>' +
            '</div>';

        if (hint) {
            content += '<div class="modal-hint" style="display: block;">' +
                '<strong>Hint:</strong> <span>' + hint + '</span>' +
                '</div>';
        }

        showUniversalModal({
            type: 'error',
            title: 'Request Failed',
            content: content
        });
    }


    function getHttpErrorHint(statusCode) {
        switch (statusCode) {
            case 400:
                return 'The request was malformed or contains invalid parameters.';
            case 401:
                return 'Authentication required. Enter a valid API token above.';
            case 403:
                return 'Access forbidden. Check your token permissions.';
            case 404:
                return 'Resource not found. Check the ID or path.';
            case 422:
                return 'Validation error. Check field values.';
            case 429:
                return 'Rate limit exceeded. Wait before retrying.';
            case 500:
                return 'Server error. Try again later.';
            default:
                return null;
        }
    }

        // Track manually collapsed menus to prevent auto-expansion - GLOBAL SCOPE
    var manuallyCollapsedMenus = {};

    window.onload = function() {
        // Determine the spec URL
        var url = window.location.search.match(/url=([^&]+)/);
        var specUrl;

        if (url && url.length > 1) {
            specUrl = decodeURIComponent(url[1]);
        } else {
            // Use OpenAPI 3 spec
            specUrl = 'swagger.json';
        }

        // Custom plugin to add client downloads to responses
        const ClientDownloadsPlugin = function() {
            return {
                wrapComponents: {
                    responses: (Original, system) => (props) => {
                        return system.React.createElement(
                            'div',
                            null,
                            system.React.createElement(Original, props),
                            system.React.createElement(
                                'div',
                                {
                                    style: {
                                        marginTop: '20px',
                                        padding: '15px',
                                        background: '#f7f7f7',
                                        borderRadius: '4px',
                                        border: '1px solid #e0e0e0'
                                    }
                                },
                                system.React.createElement(
                                    'h4',
                                    { style: { marginTop: 0, marginBottom: '15px', fontSize: '14px', fontWeight: '600' } },
                                    '📦 Download Client Libraries'
                                ),
                                system.React.createElement(
                                    'div',
                                    {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                            gap: '10px'
                                        }
                                    },
                                    [
                                        { name: 'Python', file: 'python.zip', icon: '🐍' },
                                        { name: 'Java', file: 'java.zip', icon: '☕' },
                                        { name: 'JavaScript', file: 'javascript.zip', icon: '📜' },
                                        { name: 'TypeScript', file: 'typescript-axios.zip', icon: '📘' },
                                        { name: 'C#', file: 'csharp.zip', icon: '#️⃣' },
                                        { name: 'Go', file: 'go.zip', icon: '🐹' },
                                        { name: 'Ruby', file: 'ruby.zip', icon: '💎' },
                                        { name: 'PHP', file: 'php.zip', icon: '🐘' },
                                        { name: 'Swift', file: 'swift.zip', icon: '🍎' },
                                        { name: 'Kotlin', file: 'kotlin.zip', icon: '🎯' },
                                        { name: 'Rust', file: 'rust.zip', icon: '🦀' },
                                        { name: 'Perl', file: 'perl.zip', icon: '🐪' },
                                        { name: 'Haskell', file: 'haskell.zip', icon: 'λ' },
                                        { name: 'Clojure', file: 'clojure.zip', icon: '🔮' },
                                        { name: 'Flask', file: 'python-flask.zip', icon: '🌶️' },
                                        { name: 'Node.js', file: 'nodejs-server.zip', icon: '🟢' },
                                        { name: 'Go Server', file: 'go-server.zip', icon: '🖥️' },
                                        { name: 'Angular', file: 'javascript-closure-angular.zip', icon: '🅰️' },
                                        { name: 'HTML', file: 'dynamic-html.zip', icon: '🌐' },
                                        { name: 'HTML2', file: 'html2.zip', icon: '📄' }
                                    ].map(function(client) {
                                        return system.React.createElement(
                                            'a',
                                            {
                                                key: client.file,
                                                href: 'clients/' + client.file,
                                                download: true,
                                                style: {
                                                    display: 'block',
                                                    padding: '8px',
                                                    background: '#fff',
                                                    border: '1px solid #d0d0d0',
                                                    borderRadius: '3px',
                                                    textDecoration: 'none',
                                                    color: '#3b4151',
                                                    textAlign: 'center',
                                                    fontSize: '11px',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer'
                                                },
                                                onMouseOver: function(e) {
                                                    e.currentTarget.style.background = '#e8e8e8';
                                                    e.currentTarget.style.borderColor = '#4990e2';
                                                },
                                                onMouseOut: function(e) {
                                                    e.currentTarget.style.background = '#fff';
                                                    e.currentTarget.style.borderColor = '#d0d0d0';
                                                }
                                            },
                                            system.React.createElement('div', { style: { fontSize: '16px', marginBottom: '4px' } }, client.icon),
                                            system.React.createElement('div', { style: { fontWeight: '500' } }, client.name)
                                        );
                                    })
                                )
                            )
                        );
                    }
                }
            };
        };

        // Initialize Swagger UI
        window.ui = SwaggerUIBundle({
            url: specUrl,
            dom_id: '#swagger-ui-content',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl,
                ClientDownloadsPlugin
            ],
            layout: "StandaloneLayout",
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            docExpansion: "list",
            filter: true,
            showExtensions: false,
            showCommonExtensions: false,
            displayRequestDuration: true,
            tryItOutEnabled: true,
            persistAuthorization: true,

            // Enable code samples and examples for each endpoint
            syntaxHighlight: {
                activate: true,
                theme: "agate"
            },
            requestSnippetsEnabled: true,
            requestSnippets: {
                generators: {
                    "curl_bash": {
                        title: "cURL (bash)",
                        syntax: "bash"
                    }
                },
                defaultExpanded: true,
                languages: null // all available languages
            },

            // OAuth configuration
            oauth2RedirectUrl: window.location.origin + window.location.pathname,


            // Request interceptor for adding custom headers and access_token parameter
            requestInterceptor: function(request) {
                // Skip swagger.json loading
                if (request.url && request.url.includes('swagger.json')) {
                    return request;
                }

                // Get the API key from localStorage if available
                var apiKey = localStorage.getItem('figshare_api_key');
                if (apiKey && apiKey.trim() !== "") {
                    request.headers['Authorization'] = 'token ' + apiKey;
                    // Add access_token as a query parameter for private endpoints
                    try {
                        var url = new URL(request.url);
                        url.searchParams.set('access_token', apiKey);
                        request.url = url.toString();
                    } catch (e) {
                        // If URL parsing fails, append manually
                        var separator = request.url.indexOf('?') === -1 ? '?' : '&';
                        request.url = request.url + separator + 'access_token=' + encodeURIComponent(apiKey);
                    }
                }
                return request;
            },

            // Response interceptor to show error modal for failed requests
            responseInterceptor: function(response) {
                // Skip swagger.json loading
                if (response.url && response.url.includes('swagger.json')) {
                    return response;
                }

                var requestUrl = response.url || 'Unknown URL';
                var status = response.status || response.statusCode || 0;
                var isError = status >= 400 || response.ok === false || response.err || response.error;

                if (isError) {
                    var responseCode = status || 'Network Error';
                    var responseBody = '';
                    var responseHeaders = '';

                    // Try to extract response body from all possible locations
                    var body = response.body || response.obj || response.data || response.text;

                    if (body) {
                        if (typeof body === 'object') {
                            responseBody = JSON.stringify(body, null, 2);
                        } else if (typeof body === 'string') {
                            try {
                                responseBody = JSON.stringify(JSON.parse(body), null, 2);
                            } catch(e) {
                                responseBody = body;
                            }
                        } else {
                            responseBody = String(body);
                        }
                    }

                    // Handle network errors (CORS, etc.)
                    var isCorsError = false;
                    if (response.err || response.error) {
                        var err = response.err || response.error;
                        responseCode = 'Network Error';
                        responseBody = err.message || String(err);
                        if (responseBody.includes('Failed to fetch')) {
                            isCorsError = true;
                            responseCode = 'N/A';
                            responseBody = 'N/A';
                        }
                    }

                    // Extract headers
                    if (response.headers) {
                        try {
                            var headersObj = {};
                            if (typeof response.headers.forEach === 'function') {
                                response.headers.forEach(function(value, key) {
                                    headersObj[key] = value;
                                });
                            } else if (typeof response.headers === 'object') {
                                headersObj = response.headers;
                            }
                            if (Object.keys(headersObj).length > 0) {
                                responseHeaders = JSON.stringify(headersObj, null, 2);
                            }
                        } catch(e) {
                            // Only set N/A for CORS errors
                            if (isCorsError) {
                                responseHeaders = 'N/A (blocked by CORS)';
                            }
                        }
                    }

                    // Set default values based on error type
                    if (!responseHeaders) {
                        if (isCorsError) {
                            responseHeaders = 'N/A (blocked by CORS)';
                        } else {
                            responseHeaders = '{}'; // Empty headers object for actual error responses
                        }
                    }
                    if (!responseBody) responseBody = 'No response body';

                    var hint = typeof responseCode === 'number' ? getHttpErrorHint(responseCode) : null;
                    showApiErrorModal(requestUrl, responseCode, responseBody, responseHeaders, hint);
                }

                return response;
            },

            onComplete: function() {
                // Hide loader
                var loader = document.querySelector('.figsh_loader');
                if (loader) {
                    loader.classList.add('hide');
                }

                // Inject documentation content into the main page
                injectDocumentationContent();

                // Initialize sidebar navigation
                initializeSidebarNavigation();

                // Move schemas/models section after custom fields documentation
                moveSchemasToEnd();

                // Initialize custom search input to work with Swagger UI filter
                initializeSearchDocFilter();

                // Initialize API key input field
                initializeApiKeyInput();
            }
        });

        // Function to scroll to the swagger-ui wrapper
        function scrollToSwaggerWrapper() {
            var wrapper = document.getElementById('swagger-ui-content') ||
                          document.querySelector('.swagger-ui-wrapper') ||
                          document.querySelector('.swagger-ui');

            if (wrapper) {
                // Get the first visible matching element from the filter results
                var firstVisibleTag = wrapper.querySelector('.opblock-tag-section:not([style*="display: none"])');
                var firstVisibleOp = wrapper.querySelector('.opblock:not([style*="display: none"])');
                var targetElement = firstVisibleTag || firstVisibleOp || wrapper;

                // Calculate position and scroll window directly
                var rect = targetElement.getBoundingClientRect();
                var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                var targetY = rect.top + scrollTop - 20; // 20px offset from top

                window.scrollTo({
                    top: targetY,
                    behavior: 'smooth'
                });

                // After scrolling completes, update the sidebar to sync with the new scroll position
                setTimeout(function() {
                    updateActiveSidebarLink();
                }, 500); // Wait for smooth scroll to complete
            }
        }

        // Function to filter Swagger UI based on query
        function filterSwaggerUI(query) {
            // Get all tag sections (API groups)
            var tagSections = document.querySelectorAll('.opblock-tag-section');
            // Get the models section
            var modelsSection = document.querySelector('.models');
            // Get the documentation sections
            var docSections = document.querySelectorAll('#documentation-sections > section, #documentation-sections > div');

            // If query is empty, show everything
            if (!query) {
                tagSections.forEach(function(section) {
                    section.style.display = '';
                    var operations = section.querySelectorAll('.opblock');
                    operations.forEach(function(op) {
                        op.style.display = '';
                    });
                });
                docSections.forEach(function(section) {
                    section.style.display = '';
                });
                if (modelsSection) {
                    modelsSection.style.display = '';
                }
                return;
            }

            // Filter tag sections and their operations
            tagSections.forEach(function(section) {
                var tagName = '';
                var tagHeader = section.querySelector('.opblock-tag a, .opblock-tag span, .opblock-tag');
                if (tagHeader) {
                    tagName = tagHeader.textContent.toLowerCase();
                }

                // Check if tag name matches
                var tagMatches = tagName.includes(query);

                // Get all operations in this section
                var operations = section.querySelectorAll('.opblock');
                var anyOperationMatches = false;

                operations.forEach(function(op) {
                    // Get operation summary and path
                    var summary = '';
                    var path = '';
                    var method = '';
                    var description = '';

                    var summaryEl = op.querySelector('.opblock-summary-description');
                    if (summaryEl) {
                        summary = summaryEl.textContent.toLowerCase();
                    }

                    var pathEl = op.querySelector('.opblock-summary-path, .opblock-summary-path__deprecated');
                    if (pathEl) {
                        path = pathEl.textContent.toLowerCase();
                    }

                    var methodEl = op.querySelector('.opblock-summary-method');
                    if (methodEl) {
                        method = methodEl.textContent.toLowerCase();
                    }

                    // Check description if operation is expanded
                    var descEl = op.querySelector('.opblock-description, .markdown');
                    if (descEl) {
                        description = descEl.textContent.toLowerCase();
                    }

                    // Check if this operation matches
                    var operationMatches = summary.includes(query) ||
                                           path.includes(query) ||
                                           method.includes(query) ||
                                           description.includes(query) ||
                                           tagMatches;

                    if (operationMatches) {
                        op.style.display = '';
                        anyOperationMatches = true;
                    } else {
                        op.style.display = 'none';
                    }
                });

                // Show/hide the tag section based on whether it matches or has matching operations
                if (tagMatches || anyOperationMatches) {
                    section.style.display = '';
                } else {
                    section.style.display = 'none';
                }
            });

            // Filter documentation sections
            docSections.forEach(function(section) {
                var text = section.textContent.toLowerCase();
                var headings = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
                var headingText = '';
                headings.forEach(function(h) {
                    headingText += ' ' + h.textContent.toLowerCase();
                });

                if (text.includes(query) || headingText.includes(query)) {
                    section.style.display = '';
                } else {
                    section.style.display = 'none';
                }
            });

            // Models/Schemas section should always be visible - don't filter it
            if (modelsSection) {
                // Always show the models section
                modelsSection.style.display = '';

                // Also ensure all model boxes are visible
                var modelBoxes = modelsSection.querySelectorAll('.model-box, .model-container, [class*="model"]');
                modelBoxes.forEach(function(box) {
                    box.style.display = '';
                });
            }
        }

        // Function to initialize the SearchDocInput to filter Swagger UI documentation
        function initializeSearchDocFilter() {
            var searchInput = document.getElementById('SearchDocInput');
            if (!searchInput) return;

            // Debounce function to prevent excessive filtering
            var debounceTimeout = null;

            searchInput.addEventListener('input', function(e) {
                var query = e.target.value.toLowerCase().trim();

                // Clear previous timeout
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                }

                // Debounce the filter operation and scroll
                debounceTimeout = setTimeout(function() {
                    filterSwaggerUI(query);
                    // Scroll to the swagger-ui wrapper to show results
                    if (query) {
                        setTimeout(function() {
                            scrollToSwaggerWrapper();
                        }, 100);
                    }
                }, 400); // 400ms debounce to allow typing
            });

            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // Clear any pending debounce
                    if (debounceTimeout) {
                        clearTimeout(debounceTimeout);
                    }
                    var query = e.target.value.toLowerCase().trim();
                    filterSwaggerUI(query);
                    // Scroll to the swagger-ui wrapper to show results
                    if (query) {
                        setTimeout(function() {
                            scrollToSwaggerWrapper();
                        }, 100);
                    }
                }
            });
        }

        // Function to initialize the API key input field
        function initializeApiKeyInput() {
            var apiKeyInput = document.getElementById('apiKeyInput');
            if (!apiKeyInput) return;

            // Load existing API key from localStorage
            var savedApiKey = localStorage.getItem('figshare_api_key');
            if (savedApiKey) {
                apiKeyInput.value = savedApiKey;
                apiKeyInput.classList.add('has-token');
            }

            // Save API key on input change
            apiKeyInput.addEventListener('input', function(e) {
                var apiKey = e.target.value.trim();
                if (apiKey) {
                    localStorage.setItem('figshare_api_key', apiKey);
                    apiKeyInput.classList.add('has-token');
                } else {
                    localStorage.removeItem('figshare_api_key');
                    apiKeyInput.classList.remove('has-token');
                }
            });

            // Also handle blur event to ensure the value is saved
            apiKeyInput.addEventListener('blur', function(e) {
                var apiKey = e.target.value.trim();
                if (apiKey) {
                    localStorage.setItem('figshare_api_key', apiKey);
                    apiKeyInput.classList.add('has-token');
                } else {
                    localStorage.removeItem('figshare_api_key');
                    apiKeyInput.classList.remove('has-token');
                }
            });
        }


        // Function to initialize sidebar navigation
        function initializeSidebarNavigation() {
            var sidebarLinks = document.querySelectorAll('.sidebar-link');

            sidebarLinks.forEach(function(link) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();

                    // Remove active class from all links
                    sidebarLinks.forEach(function(l) {
                        l.classList.remove('active');
                    });

                    // Add active class to clicked link
                    this.classList.add('active');

                    // Handle operation blocks expansion/collapse for Articles menu items
                    var href = this.getAttribute('href');
                    if (href && href.startsWith('#operations-')) {
                        // This is an operation link (Articles menu item)
                        var operationId = href.substring(1); // Remove # prefix


                        // Scroll to the operation
                        var operationElement = document.getElementById(operationId);
                        if (operationElement) {
                            setTimeout(function() {
                                operationElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100); // Small delay to allow expansion animation
                        }

                        // Don't prevent default - let the hash change happen
                        return;
                    }

                    // Check if this is a schema subitem (has scrollToSchema in onclick)
                    var onclick = this.getAttribute('onclick');
                    if (onclick && onclick.includes('scrollToSchema')) {
                        // Ensure presenters menu is expanded
                        var presentersMenu = document.getElementById('presenters-menu');
                        if (presentersMenu) {
                            if (presentersMenu.classList.contains('collapsed')) {
                                presentersMenu.classList.remove('collapsed');
                                presentersMenu.classList.add('expanded');
                            }
                        }
                        // The onclick handler will execute after this and handle the scrolling
                        return;
                    }

                    // Get the tag name from data attribute
                    var tag = this.getAttribute('data-tag');

                    // Special handling for presenters
                    if (tag === 'presenters') {
                        scrollToPresenters();
                        return;
                    }

                    // Skip if no data-tag attribute (e.g., child links that use onclick handlers)
                    if (!tag) {
                        return;
                    }

                    // Find the tag section in Swagger UI - try multiple selectors
                    var tagElement = null;

                    // Try to find by operations-tag ID
                    tagElement = document.querySelector('#operations-tag-' + tag);

                    if (!tagElement) {
                        // Try to find by data-tag attribute
                        tagElement = document.querySelector('[data-tag="' + tag + '"]');
                    }

                    if (!tagElement) {
                        // Try to find by opblock-tag-section class with matching h3/h4
                        var tagSections = document.querySelectorAll('.opblock-tag-section');
                        for (var i = 0; i < tagSections.length; i++) {
                            var heading = tagSections[i].querySelector('h3, h4');
                            if (heading && heading.textContent.toLowerCase().includes(tag.toLowerCase())) {
                                tagElement = tagSections[i];
                                break;
                            }
                        }
                    }

                    if (!tagElement) {
                        // Try to find by opblock-tag class
                        var opblockTags = document.querySelectorAll('.opblock-tag');
                        for (var i = 0; i < opblockTags.length; i++) {
                            if (opblockTags[i].textContent.toLowerCase().includes(tag.toLowerCase())) {
                                tagElement = opblockTags[i].closest('.opblock-tag-section');
                                break;
                            }
                        }
                    }

                    if (tagElement) {
                        // Scroll to the tag
                        tagElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

                        // Also try to expand the tag if it's collapsed
                        var toggleButton = tagElement.querySelector('.expand-operation');
                        if (toggleButton && toggleButton.getAttribute('aria-expanded') === 'false') {
                            toggleButton.click();
                        }
                    } else {
                    }
                });
            });

            // Highlight active section on scroll
            window.addEventListener('scroll', function() {
                updateActiveSidebarLink();
            });
        }

        // Function to update active sidebar link based on scroll position
        function updateActiveSidebarLink() {
            var sidebarLinks = document.querySelectorAll('.sidebar-link');
            var scrollPosition = window.scrollY + 55;

            var activeLink = null;
            var bestMatch = null; // { link, elementTop }
            var inPresentersSection = false;

            sidebarLinks.forEach(function(link) {
                var targetElement = null;

                // Check if this is an operations link (Articles subitems use href="#operations-articles-*")
                var href = link.getAttribute('href');
                if (href && href.startsWith('#operations-')) {
                    // Extract operation ID from href="#operations-articles-operation_name"
                    var operationId = href.substring(1); // Remove the # prefix
                    targetElement = document.getElementById(operationId);

                    // If the element doesn't exist by ID, try to find it by matching the link text
                    if (!targetElement) {
                        var linkText = link.textContent.trim().toLowerCase();
                        var allHeadings = document.querySelectorAll('h3, h4, h2, h5');
                        for (var i = 0; i < allHeadings.length; i++) {
                            var headingText = allHeadings[i].textContent.trim().toLowerCase();
                            // Check if heading text matches or contains the link text
                            if (headingText.includes(linkText) || linkText.includes(headingText.split('(')[0].trim())) {
                                targetElement = allHeadings[i].closest('.opblock') || allHeadings[i].parentElement;
                                break;
                            }
                        }
                    }
                }

                // Check if this is a documentation/upload section link (has onclick with scrollToDocSection)
                var onclickAttr = link.getAttribute('onclick');
                if (!targetElement && onclickAttr && onclickAttr.includes('scrollToDocSection')) {
                    // Extract section ID from onclick="scrollToDocSection('section-id')"
                    var match = onclickAttr.match(/scrollToDocSection\('([^']+)'\)/);
                    if (match && match[1]) {
                        var sectionId = 'doc-section-' + match[1];
                        targetElement = document.getElementById(sectionId);
                    }
                } else if (!targetElement && onclickAttr && onclickAttr.includes('toggleSubmenuAndScroll')) {
                    // Extract section ID from onclick="toggleSubmenuAndScroll(event, 'menu-id', 'section-id')"
                    var match = onclickAttr.match(/toggleSubmenuAndScroll\([^,]+,\s*'[^']+',\s*'([^']+)'\)/);
                    if (match && match[1]) {
                        var sectionId = 'doc-section-' + match[1];
                        targetElement = document.getElementById(sectionId);
                    }
                } else if (!targetElement && onclickAttr && onclickAttr.includes('presenters-menu')) {
                    // This is the Presenters parent link - find models/schemas section
                    var modelsControl = document.querySelector('.models-control');
                    if (modelsControl) {
                        targetElement = modelsControl.closest('section') || modelsControl.closest('div') || modelsControl.parentElement;
                    }

                    if (!targetElement) {
                        targetElement = document.querySelector('.models-wrapper') ||
                                    document.querySelector('.models') ||
                                    document.querySelector('#models') ||
                                    document.querySelector('section.models') ||
                                    document.querySelector('[id*="schema"]');
                    }

                    if (!targetElement) {
                        var headings = document.querySelectorAll('h2, h3, h4, h5');
                        for (var i = 0; i < headings.length; i++) {
                            var text = headings[i].textContent.toLowerCase();
                            if (text.includes('model') || text.includes('schema')) {
                                targetElement = headings[i].closest('section') || headings[i].parentElement;
                                break;
                            }
                        }
                    }
                } else if (!targetElement && onclickAttr && onclickAttr.includes('scrollToSchema')) {
                    // This is an individual schema child link
                    var schemaMatch = onclickAttr.match(/scrollToSchema\('([^']+)'\)/);
                    if (schemaMatch && schemaMatch[1]) {
                        var schemaName = schemaMatch[1];

                        // Try to find the schema model box
                        var modelBoxes = document.querySelectorAll('.model-box');
                        for (var i = 0; i < modelBoxes.length; i++) {
                            var box = modelBoxes[i];
                            var titleElement = box.querySelector('.model-title span, .model-title__text, .model-title');
                            if (titleElement && titleElement.textContent.trim() === schemaName) {
                                targetElement = box;
                                break;
                            }
                        }

                        // If not found, try by ID
                        if (!targetElement) {
                            targetElement = document.getElementById('model-' + schemaName);
                        }
                    }
                } else if (!targetElement) {
                    // This is an API section link (has data-tag)
                    var tag = link.getAttribute('data-tag');

                    if (tag === 'schemas') {
                        // Legacy handling for schemas with data-tag (shouldn't exist anymore but keep for safety)
                        targetElement = document.querySelector('.models-wrapper') ||
                                    document.querySelector('.models') ||
                                    document.querySelector('#models') ||
                                    document.querySelector('section.models') ||
                                    document.querySelector('[id*="schema"]');

                        if (!targetElement) {
                            var headings = document.querySelectorAll('h2, h3, h4, h5');
                            for (var i = 0; i < headings.length; i++) {
                                var text = headings[i].textContent.toLowerCase();
                                if (text.includes('model') || text.includes('schema')) {
                                    targetElement = headings[i].closest('section') || headings[i].parentElement;
                                    break;
                                }
                            }
                        }
                    } else if (tag) {
                        // Try to find by operations-tag ID
                        targetElement = document.querySelector('#operations-tag-' + tag);

                        if (!targetElement) {
                            // Try to find by data-tag attribute
                            targetElement = document.querySelector('[data-tag="' + tag + '"]');
                        }

                        if (!targetElement) {
                            // Try to find by opblock-tag-section
                            var tagSections = document.querySelectorAll('.opblock-tag-section');
                            for (var i = 0; i < tagSections.length; i++) {
                                var heading = tagSections[i].querySelector('h3, h4');
                                if (heading && heading.textContent.toLowerCase().includes(tag.toLowerCase())) {
                                    targetElement = tagSections[i];
                                    break;
                                }
                            }
                        }

                        // Final fallback: search by parent link text
                        if (!targetElement) {
                            var parentLink = link.closest('.parent-item-wrapper');
                            if (parentLink) {
                                var parentLinkText = parentLink.textContent.trim().toLowerCase();
                                var allHeadings = document.querySelectorAll('h2, h3, h4');
                                for (var i = 0; i < allHeadings.length; i++) {
                                    var headingText = allHeadings[i].textContent.trim().toLowerCase();
                                    if (headingText.includes(parentLinkText) || parentLinkText.includes(headingText.split('(')[0].trim())) {
                                        targetElement = allHeadings[i].closest('.opblock-tag-section') || allHeadings[i].closest('section') || allHeadings[i].parentElement;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // Find the section currently in view
                if (targetElement) {
                    // Skip hidden elements (filtered out by search)
                    var computedStyle = window.getComputedStyle(targetElement);
                    if (computedStyle.display === 'none') {
                        return; // Skip this link, its target is hidden
                    }

                    // Also check if parent section is hidden
                    var parentSection = targetElement.closest('.opblock-tag-section');
                    if (parentSection) {
                        var parentStyle = window.getComputedStyle(parentSection);
                        if (parentStyle.display === 'none') {
                            return; // Skip this link, its parent section is hidden
                        }
                    }

                    var elementTop = targetElement.getBoundingClientRect().top + window.scrollY;

                    // Find the section that is currently in view (at or above scroll position but closest to it)
                    // This is the section the user is currently viewing
                    if (elementTop <= scrollPosition) {
                        // This section is above or at the scroll trigger point
                        if (!bestMatch || elementTop > bestMatch.elementTop) {
                            // This is the best match so far (closest to the scroll position from above)
                            bestMatch = { link: link, elementTop: elementTop };

                            // Check if this is a presenters-related link
                            var linkOnclick = link.getAttribute('onclick');
                            if (linkOnclick && (linkOnclick.includes('presenters-menu') || linkOnclick.includes('scrollToSchema'))) {
                                inPresentersSection = true;
                            }
                        }
                    }
                }
            });

            if (bestMatch) {
                activeLink = bestMatch.link;
            }

            // Update active class and manage menu visibility
            // If we're at the very top of the page (scrollY < 200), collapse all menus
            if (window.scrollY < 200) {
                sidebarLinks.forEach(function(l) {
                    l.classList.remove('active');
                });

                // Collapse all menus when at the top (ignore manual state when at top)
                var allMenus = document.querySelectorAll('.api-sidebar ul[id]');
                allMenus.forEach(function(menu) {
                    if (menu.classList.contains('expanded')) {
                        menu.classList.remove('expanded');
                        menu.classList.add('collapsed');
                    }
                });
            } else if (activeLink) {
                sidebarLinks.forEach(function(l) {
                    l.classList.remove('active');
                });
                activeLink.classList.add('active');

                // Find which menu should be expanded for the active link
                var menuToExpand = null;
                var grandparentToExpand = null;

                var parentWrapper = activeLink.closest('.parent-item-wrapper');
                if (parentWrapper) {
                    // This is a parent link - find its submenu
                    var parentLi = parentWrapper.closest('li');
                    if (parentLi) {
                        menuToExpand = parentLi.querySelector('ul');
                    }
                } else {
                    // This is a child link - find its parent menu
                    var childLi = activeLink.closest('li');
                    if (childLi) {
                        menuToExpand = childLi.closest('ul');

                        // Check if this menu is nested inside another menu (3rd level)
                        if (menuToExpand && menuToExpand.parentElement) {
                            grandparentToExpand = menuToExpand.parentElement.closest('ul');
                        }
                    }
                }

                // Special handling for presenters menu - if we're in presenters section, expand presenters-menu
                if (inPresentersSection) {
                    var presentersMenu = document.getElementById('presenters-menu');
                    if (presentersMenu) {
                        menuToExpand = presentersMenu;
                    }
                }

                // Collapse all menus except the ones that should be expanded
                var allMenus = document.querySelectorAll('.api-sidebar > ul > li > ul[id]');
                allMenus.forEach(function(menu) {
                    // Skip if this is the menu we want to expand or its grandparent
                    if (menu === menuToExpand || menu === grandparentToExpand) {
                        return;
                    }

                    // Auto-collapse expanded menus, but respect manually collapsed ones
                    // If a menu was manually collapsed (true), keep it collapsed
                    // If a menu was manually expanded (false) or never toggled (undefined), allow auto-collapse
                    if (menu.classList.contains('expanded')) {
                        menu.classList.remove('expanded');
                        menu.classList.add('collapsed');
                        // Clear the manual expansion flag when auto-collapsing
                        if (menu.id && manuallyCollapsedMenus[menu.id] === false) {
                            delete manuallyCollapsedMenus[menu.id];
                        }
                    }
                });

                // Also collapse sibling level-3 menus (nested menus like oauth-intro and api-features)
                if (menuToExpand && menuToExpand.id && grandparentToExpand && grandparentToExpand.id) {
                    // Find all level-3 sibling menus within the grandparent
                    var level3Menus = grandparentToExpand.querySelectorAll('ul[id]');
                    level3Menus.forEach(function(siblingMenu) {
                        // Skip the menu we want to expand
                        if (siblingMenu === menuToExpand) {
                            return;
                        }

                        // Collapse sibling level-3 menus
                        if (siblingMenu.classList.contains('expanded')) {
                            siblingMenu.classList.remove('expanded');
                            siblingMenu.classList.add('collapsed');
                            // Clear the manual expansion flag when auto-collapsing
                            if (siblingMenu.id && manuallyCollapsedMenus[siblingMenu.id] === false) {
                                delete manuallyCollapsedMenus[siblingMenu.id];
                            }
                        }
                    });
                }

                // Expand the menu that contains the active link
                // Scrolling always expands the relevant menu, overriding manual collapse
                if (menuToExpand && menuToExpand.id) {
                    // Clear manual collapse state when scrolling expands a menu
                    if (manuallyCollapsedMenus[menuToExpand.id] === true) {
                        delete manuallyCollapsedMenus[menuToExpand.id];
                    }

                    if (menuToExpand.classList.contains('collapsed')) {
                        menuToExpand.classList.remove('collapsed');
                        menuToExpand.classList.add('expanded');
                    }
                }

                // Expand grandparent if needed (for 3rd level items)
                if (grandparentToExpand && grandparentToExpand.id) {
                    if (grandparentToExpand.classList.contains('collapsed')) {
                        // Clear manual collapse flag for grandparent too
                        if (manuallyCollapsedMenus[grandparentToExpand.id] === true) {
                            delete manuallyCollapsedMenus[grandparentToExpand.id];
                        }
                        grandparentToExpand.classList.remove('collapsed');
                        grandparentToExpand.classList.add('expanded');
                    }
                }

                // Auto-scroll the sidebar to keep the active link visible
                if (activeLink) {
                    var sidebar = document.querySelector('.api-sidebar');
                    if (sidebar) {
                        var linkRect = activeLink.getBoundingClientRect();
                        var sidebarRect = sidebar.getBoundingClientRect();

                        // Check if the active link is outside the visible area of the sidebar
                        var isAboveView = linkRect.top < sidebarRect.top;
                        var isBelowView = linkRect.bottom > sidebarRect.bottom;

                        if (isAboveView || isBelowView) {
                            // Calculate the scroll position to center the active link
                            var linkOffsetTop = activeLink.offsetTop;
                            var sidebarHeight = sidebar.clientHeight;
                            var linkHeight = activeLink.offsetHeight;

                            // Center the active link in the sidebar
                            var scrollTo = linkOffsetTop - (sidebarHeight / 2) + (linkHeight / 2);

                            sidebar.scrollTo({
                                top: scrollTo,
                                behavior: 'smooth'
                            });

                        }
                    }
                }
            }
        }
    };
    // Function to toggle submenu and optionally scroll to a documentation section
    function toggleSubmenuAndScroll(event, menuId, sectionId) {
        event.stopPropagation();
        event.preventDefault();

        var submenu = document.getElementById(menuId);

        if (submenu) {
            // Check if menu is currently collapsed (about to be expanded)
            var isExpanding = submenu.classList.contains('collapsed');

            // Perform the toggle using the same logic as toggleSubmenu
            if (isExpanding) {
                // Before expanding, collapse all sibling menus at the same level
                var parentLi = submenu.parentElement;
                if (parentLi && parentLi.parentElement) {
                    var parentUl = parentLi.parentElement;
                    for (var i = 0; i < parentUl.children.length; i++) {
                        var li = parentUl.children[i];
                        if (li.tagName === 'LI') {
                            for (var j = 0; j < li.children.length; j++) {
                                var child = li.children[j];
                                if (child.tagName === 'UL' && child.id !== menuId && child.classList.contains('expanded')) {
                                    child.classList.remove('expanded');
                                    child.classList.add('collapsed');
                                    // Mark as manually collapsed so scroll won't auto-expand
                                    if (child.id) {
                                        manuallyCollapsedMenus[child.id] = true;
                                    }
                                    var nestedMenus = child.querySelectorAll('ul.expanded');
                                    nestedMenus.forEach(function(nested) {
                                        nested.classList.remove('expanded');
                                        nested.classList.add('collapsed');
                                        if (nested.id) {
                                            manuallyCollapsedMenus[nested.id] = true;
                                        }
                                    });
                                }
                            }
                        }
                    }
                }

                // Expand the menu
                submenu.classList.remove('collapsed');
                submenu.classList.add('expanded');
                // Mark as manually expanded and clear collapsed state
                manuallyCollapsedMenus[menuId] = false;

                // Scroll to the section if provided
                if (sectionId) {
                    setTimeout(function() {
                        var targetElement = document.getElementById('doc-section-' + sectionId);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);
                }
            } else {
                // Collapse the menu
                submenu.classList.add('collapsed');
                submenu.classList.remove('expanded');
                manuallyCollapsedMenus[menuId] = true;

                // Also collapse all nested child menus
                var nestedMenus = submenu.querySelectorAll('ul.expanded');
                nestedMenus.forEach(function(nested) {
                    nested.classList.remove('expanded');
                    nested.classList.add('collapsed');
                    if (nested.id) {
                        manuallyCollapsedMenus[nested.id] = true;
                    }
                });
            }
        }
    }

    // Function to toggle submenu visibility
    function toggleSubmenu(event, menuId) {
        event.stopPropagation();
        event.preventDefault();

        var submenu = document.getElementById(menuId);

        if (submenu) {
            // Check if menu is currently collapsed
            if (submenu.classList.contains('collapsed')) {
                // Before expanding, collapse all sibling menus at the same level
                var parentLi = submenu.parentElement;
                if (parentLi && parentLi.parentElement) {
                    // Get the parent UL that contains all sibling LI elements
                    var parentUl = parentLi.parentElement;

                    // Iterate through all child LI elements of the parent UL
                    for (var i = 0; i < parentUl.children.length; i++) {
                        var li = parentUl.children[i];
                        if (li.tagName === 'LI') {
                            // Find UL children of this LI
                            for (var j = 0; j < li.children.length; j++) {
                                var child = li.children[j];
                                if (child.tagName === 'UL' && child.id !== menuId && child.classList.contains('expanded')) {
                                    child.classList.remove('expanded');
                                    child.classList.add('collapsed');
                                    // Mark as manually collapsed so scroll won't auto-expand
                                    if (child.id) {
                                        manuallyCollapsedMenus[child.id] = true;
                                    }

                                    // Also collapse any nested children
                                    var nestedMenus = child.querySelectorAll('ul.expanded');
                                    nestedMenus.forEach(function(nested) {
                                        nested.classList.remove('expanded');
                                        nested.classList.add('collapsed');
                                        if (nested.id) {
                                            manuallyCollapsedMenus[nested.id] = true;
                                        }
                                    });
                                }
                            }
                        }
                    }
                }

                // Expand the menu
                submenu.classList.remove('collapsed');
                submenu.classList.add('expanded');
                // Mark as manually expanded and clear collapsed state
                manuallyCollapsedMenus[menuId] = false;

            } else {
                // Collapse the menu
                submenu.classList.add('collapsed');
                submenu.classList.remove('expanded');
                // Mark as manually collapsed
                manuallyCollapsedMenus[menuId] = true;

                // Also collapse all nested child menus
                var nestedMenus = submenu.querySelectorAll('ul.expanded');
                nestedMenus.forEach(function(nested) {
                    nested.classList.remove('expanded');
                    nested.classList.add('collapsed');
                    if (nested.id) {
                        manuallyCollapsedMenus[nested.id] = true;
                    }
                });
            }
        }
    }

    // Function to scroll to presenters section (Schemas section in documentation)
    function scrollToPresenters() {
        var targetElement = null;

        // Strategy 1: Look for the models-control button (Swagger UI 5.x)
        var modelsControl = document.querySelector('.models-control');
        if (modelsControl) {
            targetElement = modelsControl.closest('section') || modelsControl.closest('div') || modelsControl.parentElement;
        }

        // Strategy 2: Look for models wrapper
        if (!targetElement) {
            targetElement = document.querySelector('.models-wrapper') ||
                          document.querySelector('.models') ||
                          document.querySelector('#models');
        }

        // Strategy 3: Look for schema section
        if (!targetElement) {
            targetElement = document.querySelector('section.models') ||
                          document.querySelector('[id*="schema"]');
        }

        // Strategy 4: Search for heading containing "Schema" or "Model"
        if (!targetElement) {
            var headings = document.querySelectorAll('h2, h3, h4, h5, span.section-models-wrapper, button.models-control span');
            for (var i = 0; i < headings.length; i++) {
                var text = headings[i].textContent.toLowerCase();
                if (text.includes('model') || text.includes('schema')) {
                    targetElement = headings[i].closest('section') || headings[i].parentElement;
                    break;
                }
            }
        }

        // Strategy 5: Look for the models section after all operations
        if (!targetElement) {
            var allSections = document.querySelectorAll('.swagger-ui > div, section');
            // Models are usually at the end, after operations
            for (var i = allSections.length - 1; i >= 0; i--) {
                var section = allSections[i];
                if (section.className && (section.className.includes('model') || section.className.includes('schema'))) {
                    targetElement = section;
                    break;
                }
            }
        }

        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // If still not found, scroll to bottom where presenters usually are
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    }

    // Function to scroll to a specific schema
    function scrollToSchema(schemaName) {

        // Ensure presenters menu is expanded
        var presentersMenu = document.getElementById('presenters-menu');
        if (presentersMenu && presentersMenu.classList.contains('collapsed')) {
            presentersMenu.classList.remove('collapsed');
            presentersMenu.classList.add('expanded');
        }

        // Update active link in sidebar
        var sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(function(link) {
            link.classList.remove('active');
            var onclick = link.getAttribute('onclick');
            if (onclick && onclick.includes("scrollToSchema('" + schemaName + "')")) {
                link.classList.add('active');
            }
        });

        var targetElement = null;
        var expandButton = null;

        // Strategy 1: Look for model-box with matching schema name (Swagger UI 5.x)
        var modelBoxes = document.querySelectorAll('.model-box');
        for (var i = 0; i < modelBoxes.length; i++) {
            var box = modelBoxes[i];
            // Check the model title
            var titleElement = box.querySelector('.model-title span, .model-title__text, .model-title');
            if (titleElement) {
                var titleText = titleElement.textContent.trim();
                if (titleText === schemaName) {
                    targetElement = box;
                    expandButton = box.querySelector('.model-box-control button, .model-toggle');
                    break;
                }
            }
        }

        // Strategy 2: Try by ID (some versions use model-SchemaName)
        if (!targetElement) {
            targetElement = document.getElementById('model-' + schemaName);
            if (targetElement) {
            }
        }

        // Strategy 3: Look in the models section for any element with schema name
        if (!targetElement) {
            var modelsSection = document.querySelector('.models, section.models, .models-wrapper');
            if (modelsSection) {
                    // Look for schema definition section
                    var allElements = modelsSection.querySelectorAll('[id*="' + schemaName + '"], [data-name="' + schemaName + '"]');
                    if (allElements.length > 0) {
                        targetElement = allElements[0].closest('.model-box, .model-container') || allElements[0];
                    }
                }
            }

            // Strategy 4: Search by text content in spans within models
            if (!targetElement) {
                var allSpans = document.querySelectorAll('.models span, section.models span');
                for (var i = 0; i < allSpans.length; i++) {
                    if (allSpans[i].textContent.trim() === schemaName) {
                        targetElement = allSpans[i].closest('.model-box') ||
                                      allSpans[i].closest('.model-container') ||
                                      allSpans[i].closest('[class*="model"]') ||
                                      allSpans[i].parentElement;
                        if (targetElement) {
                            break;
                        }
                    }
                }
            }

            if (targetElement) {
                // Try to expand the model if there's a toggle button
                // Look for expand button in multiple ways
                if (!expandButton) {
                    expandButton = targetElement.querySelector('button[aria-label*="Expand"], button.model-toggle, .model-box-control button');
                }

                // Always try to click the expand button to ensure it's expanded
                if (expandButton) {
                    // Check if it's collapsed (aria-expanded="false")
                    var ariaExpanded = expandButton.getAttribute('aria-expanded');

                    // ONLY click if it's explicitly collapsed (aria-expanded="false")
                    // Do NOT click if it's already expanded (aria-expanded="true") or unknown (null)
                    if (ariaExpanded === 'false') {
                        expandButton.click();
                    } else {
                    }
                }

                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Highlight the target element briefly
                var highlightElement = targetElement.querySelector('.model-box') || targetElement;
                var originalBg = highlightElement.style.backgroundColor;
                var originalTransition = highlightElement.style.transition;

                highlightElement.style.transition = 'background-color 0.3s ease';
                highlightElement.style.backgroundColor = '#fff3cd';

                // Use transitionend event instead of setTimeout for cleanup
                var resetHighlight = function() {
                    highlightElement.style.backgroundColor = originalBg;
                    highlightElement.style.transition = originalTransition;
                    highlightElement.removeEventListener('transitionend', resetHighlight);
                };

                // Schedule removal of highlight after CSS handles the transition
                highlightElement.addEventListener('transitionend', resetHighlight);
            } else {
                console.warn('Schema not found:', schemaName, '- Scrolling to presenters section');
                // If schema not found, scroll to presenters section
                scrollToPresenters();
            }
    }


    // Function to scroll to documentation sections
    function scrollToDocSection(sectionId) {
        var targetElement = document.getElementById('doc-section-' + sectionId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Track which menus should be expanded
            var menusToExpand = [];
            var clickedLinkElement = null;
            var immediateParentUl = null;

            // Update active class in sidebar
            var sidebarLinks = document.querySelectorAll('.sidebar-link');
            sidebarLinks.forEach(function(link) {
                link.classList.remove('active');
                if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionId)) {
                    link.classList.add('active');
                    clickedLinkElement = link;

                    // Store the immediate parent UL first
                    var clickedLi = link.closest('li');
                    immediateParentUl = clickedLi ? clickedLi.closest('ul') : null;

                    // Find and expand all parent menus
                    var currentElement = link.closest('li');
                    while (currentElement) {
                        // Find the parent UL
                        var parentUl = currentElement.closest('ul');
                        if (parentUl && parentUl.id) {
                            menusToExpand.push(parentUl.id);
                            if (parentUl.classList.contains('collapsed')) {
                                parentUl.classList.remove('collapsed');
                                parentUl.classList.add('expanded');
                            }
                            // Remove from manual tracking so it can auto-collapse when scrolling
                            delete manuallyCollapsedMenus[parentUl.id];

                            // Move to the parent LI of this UL to continue up the tree
                            currentElement = parentUl.parentElement;
                            if (currentElement && currentElement.tagName === 'LI') {
                                continue;
                            }
                        }
                        break;
                    }
                }
            });

            // Now collapse sibling level 3 menus BEFORE the general collapse
            if (immediateParentUl && immediateParentUl.id) {
                // This is a level 3 item - find its siblings
                var grandparentLi = immediateParentUl.parentElement;
                if (grandparentLi && grandparentLi.tagName === 'LI') {
                    var grandparentUl = grandparentLi.closest('ul');
                    if (grandparentUl) {
                        // Find all level 3 menus (UL children of LI children of grandparentUl)
                        for (var i = 0; i < grandparentUl.children.length; i++) {
                            var li = grandparentUl.children[i];
                            if (li.tagName === 'LI') {
                                for (var j = 0; j < li.children.length; j++) {
                                    var childUl = li.children[j];
                                    if (childUl.tagName === 'UL' && childUl.id !== immediateParentUl.id && childUl.classList.contains('expanded')) {
                                        childUl.classList.remove('expanded');
                                        childUl.classList.add('collapsed');
                                        // Mark as manually collapsed so scroll won't auto-expand
                                        if (childUl.id) {
                                            manuallyCollapsedMenus[childUl.id] = true;
                                        }

                                        // Also collapse any nested children
                                        var nestedMenus = childUl.querySelectorAll('ul.expanded');
                                        nestedMenus.forEach(function(nested) {
                                            nested.classList.remove('expanded');
                                            nested.classList.add('collapsed');
                                            if (nested.id) {
                                                manuallyCollapsedMenus[nested.id] = true;
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Collapse all other menus that are not in the menusToExpand list
            var allMenus = document.querySelectorAll('.api-sidebar ul[id]');
            allMenus.forEach(function(menu) {
                if (menu.id && !menusToExpand.includes(menu.id)) {
                    // Only clear manual tracking if the menu was manually expanded (false)
                    // Keep manual collapse (true) state so it stays collapsed
                    if (manuallyCollapsedMenus[menu.id] === false) {
                        delete manuallyCollapsedMenus[menu.id];
                    }
                    // Collapse them
                    if (menu.classList.contains('expanded')) {
                        menu.classList.remove('expanded');
                        menu.classList.add('collapsed');
                    }
                }
            });
        }
    }

    // Function to inject documentation content into the main page
    function injectDocumentationContent() {
        const swaggerWrapper = document.getElementById('swagger-ui-content');
        if (!swaggerWrapper) return;

        // Build documentation sections
        const introDiv = document.getElementById('description_intro');
        const oauthIntroDiv = document.getElementById('description_oauth_intro');
        const oauthQuickDiv = document.getElementById('description_oauth_quick');
        const oauthScopeDiv = document.getElementById('description_oauth_scope');
        const oauthGrantDiv = document.getElementById('description_oauth_grant');
        const apiFeaturesDiv = document.getElementById('description_api_features');
        const apiAuthDiv = document.getElementById('description_api_auth');
        const apiParametersDiv = document.getElementById('description_api_parameters');
        const apiResourceDiv = document.getElementById('description_api_resourcerepresentation');
        const apiErrorsDiv = document.getElementById('description_api_errors');
        const apiSearchDiv = document.getElementById('description_api_search');
        const apiRateLimitDiv = document.getElementById('description_api_ratelimit');
        const apiRequestsDiv = document.getElementById('description_api_requests');
        const apiCorsDiv = document.getElementById('description_api_cors');
        const apiImpersonationDiv = document.getElementById('description_api_impersonation');

        // Upload files content divs
        const uploadStepsDiv = document.getElementById('description_upload_steps');
        const uploadApiDiv = document.getElementById('description_upload_api');
        const uploadPartsDiv = document.getElementById('description_upload_parts_api');
        const uploadExampleDiv = document.getElementById('description_upload_example');
        const uploadOutputDiv = document.getElementById('description_upload_output');
        const uploadBashDiv = document.getElementById('description_upload_bash');
        const uploadS3Div = document.getElementById('description_upload_from_s3');

        // Search content divs
        const searchIntroDiv = document.getElementById('description_search_intro');
        const searchOperatorsDiv = document.getElementById('description_search_operators');
        const searchAttributesDiv = document.getElementById('description_search_attributes');
        const searchQuickDiv = document.getElementById('description_search_quick');
        const searchAdvancedDiv = document.getElementById('description_search_advanced');
        const searchCombinedDiv = document.getElementById('description_search_combined');
        const searchComplexDiv = document.getElementById('description_search_complex');

        // Stats content divs - Stats service
        const statsServiceIntroDiv = document.getElementById('description_stats_service_intro');
        const statsServiceAuthDiv = document.getElementById('description_stats_service_auth');
        const statsServiceErrorsDiv = document.getElementById('description_stats_service_errors');
        const statsServiceEndpointsDiv = document.getElementById('description_stats_service_endpoints');

        // Stats - Breakdown
        const statsBreakdownEndpointsDiv = document.getElementById('description_stats_breakdown_endpoints');
        const statsBreakdownAuthDiv = document.getElementById('description_stats_breakdown_auth');
        const statsBreakdownFormatDiv = document.getElementById('description_stats_breakdown_format');
        const statsBreakdownParamsDiv = document.getElementById('description_stats_breakdown_params');
        const statsBreakdownExamplesDiv = document.getElementById('description_stats_breakdown_examples');

        // Stats - Timeline
        const statsTimelineEndpointsDiv = document.getElementById('description_stats_timeline_endpoints');
        const statsTimelineAuthDiv = document.getElementById('description_stats_timeline_auth');
        const statsTimelineFormatDiv = document.getElementById('description_stats_timeline_format');
        const statsTimelineParamsDiv = document.getElementById('description_stats_timeline_params');
        const statsTimelineExamplesDiv = document.getElementById('description_stats_timeline_examples');

        // Stats - Tops
        const statsTopsEndpointsDiv = document.getElementById('description_stats_tops_endpoints');
        const statsTopsAuthDiv = document.getElementById('description_stats_tops_auth');
        const statsTopsFormatDiv = document.getElementById('description_stats_tops_format');
        const statsTopsParamsDiv = document.getElementById('description_stats_tops_params');
        const statsTopsExamplesDiv = document.getElementById('description_stats_tops_examples');

        // Stats - Totals
        const statsTotalsEndpointsDiv = document.getElementById('description_stats_totals_endpoints');
        const statsTotalsAuthDiv = document.getElementById('description_stats_totals_auth');
        const statsTotalsFormatDiv = document.getElementById('description_stats_totals_format');
        const statsTotalsExamplesDiv = document.getElementById('description_stats_totals_examples');

        // Stats - Count Articles
        const statsCountEndpointsDiv = document.getElementById('description_stats_count_endpoints');
        const statsCountAuthDiv = document.getElementById('description_stats_count_auth');
        const statsCountFormatDiv = document.getElementById('description_stats_count_format');
        const statsCountExamplesDiv = document.getElementById('description_stats_count_examples');

        // OAI PMH content divs
        const oaiPmhDiv = document.getElementById('description_oai_pmh');
        const oaiBaseurlDiv = document.getElementById('description_oai_baseurl');
        const oaiItemarticleDiv = document.getElementById('description_oai_itemarticle');
        const oaiMetadataDiv = document.getElementById('description_oai_metadata');
        const oaiDatestampDiv = document.getElementById('description_oai_datestamp');
        const oaiSetsDiv = document.getElementById('description_oai_sets');
        const oaiUpdateScheduleDiv = document.getElementById('description_oai_update_schedule');
        const oaiPaginationDiv = document.getElementById('description_oai_pagination');
        const oaiRatelimitDiv = document.getElementById('description_oai_ratelimit');
        const oaiFuturedevDiv = document.getElementById('description_oai_futuredev');
        const oaiSomeexamplesDiv = document.getElementById('description_oai_someexamples');

        // HR Feed content divs
        const hrfeedEndpointDiv = document.getElementById('description_hrfeed_endpoint');
        const hrfeedExamplesPythonDiv = document.getElementById('description_hrfeed_examples_python');
        const hrfeedExamplesJavaDiv = document.getElementById('description_hrfeed_examples_java');
        const hrfeedExamplesCsharpDiv = document.getElementById('description_hrfeed_examples_csharp');
        const hrfeedExamplesCurlDiv = document.getElementById('description_hrfeed_examples_curl');
        const hrfeedResponseDiv = document.getElementById('description_hrfeed_response');
        const hrfeedErrorsDiv = document.getElementById('description_hrfeed_errors');
        const hrfeedNotesDiv = document.getElementById('description_hrfeed_notes');

        // Custom Fields content divs
        const customFieldsEndpointDiv = document.getElementById('description_custom_fields_endpoint');
        const customFieldsExamplesPythonDiv = document.getElementById('description_custom_fields_examples_python');
        const customFieldsExamplesJavaDiv = document.getElementById('description_custom_fields_examples_java');
        const customFieldsExamplesCsharpDiv = document.getElementById('description_custom_fields_examples_csharp');
        const customFieldsExamplesCurlDiv = document.getElementById('description_custom_fields_examples_curl');
        const customFieldsResponseDiv = document.getElementById('description_custom_fields_response');
        const customFieldsErrorsDiv = document.getElementById('description_custom_fields_errors');
        const customFieldsNotesDiv = document.getElementById('description_custom_fields_notes');

        // Build documentation content in two parts:
        // Part 1: Before API endpoints (intro, oauth, api-features)
        let docContentBefore = '<div id="documentation-sections-before" style="max-width: 100%;">';

        // Introduction
        docContentBefore += '<div id="doc-section-intro" class="guide-section" style="margin-bottom: 40px;">';
        docContentBefore += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">Figshare Documentation</h2>';
        docContentBefore += '<div class="markdown-content">' + (introDiv ? introDiv.innerHTML : '') + '</div>';
        docContentBefore += '</div>';

        // OAuth section
        docContentBefore += '<div id="doc-section-oauth" class="guide-section" style="margin-bottom: 40px;">';
        docContentBefore += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">OAuth</h2>';
        docContentBefore += '<div class="markdown-content">';
        if (oauthIntroDiv) {
            docContentBefore += '<div id="doc-section-oauth-intro" style="margin-bottom: 30px;">';
            docContentBefore += '<h3 style="font-size: 18px; margin-bottom: 15px;">Introduction</h3>';
            docContentBefore += oauthIntroDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (oauthQuickDiv) {
            docContentBefore += '<div id="doc-section-oauth-quick" style="margin-bottom: 30px;">';
            docContentBefore += oauthQuickDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (oauthScopeDiv) {
            docContentBefore += '<div id="doc-section-oauth-scope" style="margin-bottom: 30px;">';
            docContentBefore += oauthScopeDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (oauthGrantDiv) {
            docContentBefore += '<div id="doc-section-oauth-grant" style="margin-bottom: 30px;">';
            docContentBefore += oauthGrantDiv.innerHTML;
            docContentBefore += '</div>';
        }
        docContentBefore += '</div></div>';

        // API Features section
        docContentBefore += '<div id="doc-section-api-features" class="guide-section" style="margin-bottom: 40px;">';
        docContentBefore += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">API Features</h2>';
        docContentBefore += '<div class="markdown-content">';
        if (apiFeaturesDiv) {
            docContentBefore += '<div style="margin-bottom: 30px;">' + apiFeaturesDiv.innerHTML + '</div>';
        }
        if (apiParametersDiv) {
            docContentBefore += '<div id="doc-section-api-parameters" style="margin-bottom: 30px;">';
            docContentBefore += apiParametersDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiResourceDiv) {
            docContentBefore += '<div id="doc-section-api-resource" style="margin-bottom: 30px;">';
            docContentBefore += apiResourceDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiAuthDiv) {
            docContentBefore += '<div id="doc-section-api-auth" style="margin-bottom: 30px;">';
            docContentBefore += apiAuthDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiErrorsDiv) {
            docContentBefore += '<div id="doc-section-api-errors" style="margin-bottom: 30px;">';
            docContentBefore += apiErrorsDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiSearchDiv) {
            docContentBefore += '<div id="doc-section-api-search" style="margin-bottom: 30px;">';
            docContentBefore += apiSearchDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiRateLimitDiv) {
            docContentBefore += '<div id="doc-section-api-ratelimit" style="margin-bottom: 30px;">';
            docContentBefore += apiRateLimitDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiRequestsDiv) {
            docContentBefore += '<div id="doc-section-api-requests" style="margin-bottom: 30px;">';
            docContentBefore += apiRequestsDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiCorsDiv) {
            docContentBefore += '<div id="doc-section-api-cors" style="margin-bottom: 30px;">';
            docContentBefore += apiCorsDiv.innerHTML;
            docContentBefore += '</div>';
        }
        if (apiImpersonationDiv) {
            docContentBefore += '<div id="doc-section-api-impersonation" style="margin-bottom: 30px;">';
            docContentBefore += apiImpersonationDiv.innerHTML;
            docContentBefore += '</div>';
        }
        docContentBefore += '</div></div>';
        docContentBefore += '</div>'; // Close documentation-sections-before

        // Part 2: After API endpoints (upload, search, stats, oai, hrfeed, custom-fields)
        let docContentAfter = '<div id="documentation-sections-after" style="padding: 20px; max-width: 100%;">';

        // Upload Files section
        docContentAfter += '<div id="doc-section-upload" class="guide-section" style="margin-bottom: 40px;">';
        docContentAfter += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">Upload Files</h2>';
        docContentAfter += '<div class="markdown-content">';
        if (uploadStepsDiv) {
            docContentAfter += '<div id="doc-section-upload-steps" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Steps to upload file</h3>';
            docContentAfter += uploadStepsDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (uploadApiDiv) {
            docContentAfter += '<div id="doc-section-upload-api" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Uploads API</h3>';
            docContentAfter += uploadApiDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (uploadPartsDiv) {
            docContentAfter += '<div id="doc-section-upload-parts" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Parts API</h3>';
            docContentAfter += uploadPartsDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (uploadExampleDiv) {
            docContentAfter += '<div id="doc-section-upload-example" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Example Upload on figshare</h3>';
            docContentAfter += uploadExampleDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (uploadOutputDiv) {
            docContentAfter += '<div id="doc-section-upload-output" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Output of Script</h3>';
            docContentAfter += uploadOutputDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (uploadBashDiv) {
            docContentAfter += '<div id="doc-section-upload-bash" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Upload Bash Script</h3>';
            docContentAfter += uploadBashDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (uploadS3Div) {
            docContentAfter += '<div id="doc-section-upload-s3" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Upload S3 File to Figshare</h3>';
            docContentAfter += uploadS3Div.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div></div>';

        // Search section
        docContentAfter += '<div id="doc-section-search" class="guide-section" style="margin-bottom: 40px;">';
        docContentAfter += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">Search</h2>';
        docContentAfter += '<div class="markdown-content">';
        if (searchIntroDiv) {
            docContentAfter += '<div id="doc-section-search-intro" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">How to find data on figshare</h3>';
            docContentAfter += searchIntroDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (searchOperatorsDiv) {
            docContentAfter += '<div id="doc-section-search-operators" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Search operators</h3>';
            docContentAfter += searchOperatorsDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (searchAttributesDiv) {
            docContentAfter += '<div id="doc-section-search-attributes" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Searchable attributes</h3>';
            docContentAfter += searchAttributesDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (searchQuickDiv) {
            docContentAfter += '<div id="doc-section-search-quick" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Quick search</h3>';
            docContentAfter += searchQuickDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (searchAdvancedDiv) {
            docContentAfter += '<div id="doc-section-search-advanced" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Advanced search</h3>';
            docContentAfter += searchAdvancedDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (searchCombinedDiv) {
            docContentAfter += '<div id="doc-section-search-combined" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Combined field search</h3>';
            docContentAfter += searchCombinedDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (searchComplexDiv) {
            docContentAfter += '<div id="doc-section-search-complex" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Complex searches</h3>';
            docContentAfter += searchComplexDiv.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div></div>';

        // Stats section
        docContentAfter += '<div id="doc-section-stats" class="guide-section" style="margin-bottom: 40px;">';
        docContentAfter += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">Stats</h2>';

        // Stats service subsection
        docContentAfter += '<div id="doc-section-stats-service" style="margin-bottom: 35px;">';
        docContentAfter += '<h3 style="font-size: 20px; margin-bottom: 20px; color: #434f59; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Stats service</h3>';
        docContentAfter += '<div class="markdown-content">';
        if (statsServiceIntroDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Intro</h4>' + statsServiceIntroDiv.innerHTML + '</div>';
        }
        if (statsServiceAuthDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Authentication</h4>' + statsServiceAuthDiv.innerHTML + '</div>';
        }
        if (statsServiceErrorsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Errors</h4>' + statsServiceErrorsDiv.innerHTML + '</div>';
        }
        if (statsServiceEndpointsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoints</h4>' + statsServiceEndpointsDiv.innerHTML + '</div>';
        }
        docContentAfter += '</div></div>';

        // Breakdown subsection
        docContentAfter += '<div id="doc-section-stats-breakdown" style="margin-bottom: 35px;">';
        docContentAfter += '<h3 style="font-size: 20px; margin-bottom: 20px; color: #434f59; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Breakdown</h3>';
        docContentAfter += '<div class="markdown-content">';
        if (statsBreakdownEndpointsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoints for retrieving a breakdown</h4>' + statsBreakdownEndpointsDiv.innerHTML + '</div>';
        }
        if (statsBreakdownAuthDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Authorization</h4>' + statsBreakdownAuthDiv.innerHTML + '</div>';
        }
        if (statsBreakdownFormatDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoint format</h4>' + statsBreakdownFormatDiv.innerHTML + '</div>';
        }
        if (statsBreakdownParamsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Request parameters</h4>' + statsBreakdownParamsDiv.innerHTML + '</div>';
        }
        if (statsBreakdownExamplesDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Examples</h4>' + statsBreakdownExamplesDiv.innerHTML + '</div>';
        }
        docContentAfter += '</div></div>';

        // Timeline subsection
        docContentAfter += '<div id="doc-section-stats-timeline" style="margin-bottom: 35px;">';
        docContentAfter += '<h3 style="font-size: 20px; margin-bottom: 20px; color: #434f59; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Timeline</h3>';
        docContentAfter += '<div class="markdown-content">';
        if (statsTimelineEndpointsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoints for retrieving a timeline</h4>' + statsTimelineEndpointsDiv.innerHTML + '</div>';
        }
        if (statsTimelineAuthDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Authorization</h4>' + statsTimelineAuthDiv.innerHTML + '</div>';
        }
        if (statsTimelineFormatDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoint format</h4>' + statsTimelineFormatDiv.innerHTML + '</div>';
        }
        if (statsTimelineParamsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Request parameters</h4>' + statsTimelineParamsDiv.innerHTML + '</div>';
        }
        if (statsTimelineExamplesDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Examples</h4>' + statsTimelineExamplesDiv.innerHTML + '</div>';
        }
        docContentAfter += '</div></div>';

        // Tops subsection
        docContentAfter += '<div id="doc-section-stats-tops" style="margin-bottom: 35px;">';
        docContentAfter += '<h3 style="font-size: 20px; margin-bottom: 20px; color: #434f59; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Tops</h3>';
        docContentAfter += '<div class="markdown-content">';
        if (statsTopsEndpointsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoints for retrieving tops</h4>' + statsTopsEndpointsDiv.innerHTML + '</div>';
        }
        if (statsTopsAuthDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Authorization</h4>' + statsTopsAuthDiv.innerHTML + '</div>';
        }
        if (statsTopsFormatDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoint format</h4>' + statsTopsFormatDiv.innerHTML + '</div>';
        }
        if (statsTopsParamsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Request parameters</h4>' + statsTopsParamsDiv.innerHTML + '</div>';
        }
        if (statsTopsExamplesDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Examples</h4>' + statsTopsExamplesDiv.innerHTML + '</div>';
        }
        docContentAfter += '</div></div>';

        // Totals subsection
        docContentAfter += '<div id="doc-section-stats-totals" style="margin-bottom: 35px;">';
        docContentAfter += '<h3 style="font-size: 20px; margin-bottom: 20px; color: #434f59; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Totals</h3>';
        docContentAfter += '<div class="markdown-content">';
        if (statsTotalsEndpointsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoints for retrieving totals</h4>' + statsTotalsEndpointsDiv.innerHTML + '</div>';
        }
        if (statsTotalsAuthDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Authorization</h4>' + statsTotalsAuthDiv.innerHTML + '</div>';
        }
        if (statsTotalsFormatDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoint format</h4>' + statsTotalsFormatDiv.innerHTML + '</div>';
        }
        if (statsTotalsExamplesDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Examples</h4>' + statsTotalsExamplesDiv.innerHTML + '</div>';
        }
        docContentAfter += '</div></div>';

        // Count Articles subsection
        docContentAfter += '<div id="doc-section-stats-count" style="margin-bottom: 35px;">';
        docContentAfter += '<h3 style="font-size: 20px; margin-bottom: 20px; color: #434f59; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Count Articles</h3>';
        docContentAfter += '<div class="markdown-content">';
        if (statsCountEndpointsDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoint for retrieving counts</h4>' + statsCountEndpointsDiv.innerHTML + '</div>';
        }
        if (statsCountAuthDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Authorization</h4>' + statsCountAuthDiv.innerHTML + '</div>';
        }
        if (statsCountFormatDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Endpoint format</h4>' + statsCountFormatDiv.innerHTML + '</div>';
        }
        if (statsCountExamplesDiv) {
            docContentAfter += '<div style="margin-bottom: 25px;"><h4 style="font-size: 16px; margin-bottom: 12px;">Example</h4>' + statsCountExamplesDiv.innerHTML + '</div>';
        }
        docContentAfter += '</div></div>';

        docContentAfter += '</div>'; // Close Stats section

        // OAI PMH section
        docContentAfter += '<div id="doc-section-oai" class="guide-section" style="margin-bottom: 40px;">';
        docContentAfter += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">OAI PMH</h2>';
        docContentAfter += '<div class="markdown-content">';
        if (oaiPmhDiv) {
            docContentAfter += '<div id="doc-section-oai-pmh" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">OAI-PMH</h3>';
            docContentAfter += oaiPmhDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiBaseurlDiv) {
            docContentAfter += '<div id="doc-section-oai-baseurl" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Base URL</h3>';
            docContentAfter += oaiBaseurlDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiItemarticleDiv) {
            docContentAfter += '<div id="doc-section-oai-itemarticle" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Item equals Article</h3>';
            docContentAfter += oaiItemarticleDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiMetadataDiv) {
            docContentAfter += '<div id="doc-section-oai-metadata" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Metadata formats</h3>';
            docContentAfter += oaiMetadataDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiDatestampDiv) {
            docContentAfter += '<div id="doc-section-oai-datestamp" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Datestamps</h3>';
            docContentAfter += oaiDatestampDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiSetsDiv) {
            docContentAfter += '<div id="doc-section-oai-sets" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Sets</h3>';
            docContentAfter += oaiSetsDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiUpdateScheduleDiv) {
            docContentAfter += '<div id="doc-section-oai-update" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Update schedule</h3>';
            docContentAfter += oaiUpdateScheduleDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiPaginationDiv) {
            docContentAfter += '<div id="doc-section-oai-pagination" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Pagination and Resumption Token Expiration</h3>';
            docContentAfter += oaiPaginationDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiRatelimitDiv) {
            docContentAfter += '<div id="doc-section-oai-ratelimit" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Rate limit</h3>';
            docContentAfter += oaiRatelimitDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiFuturedevDiv) {
            docContentAfter += '<div id="doc-section-oai-futuredev" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Future development</h3>';
            docContentAfter += oaiFuturedevDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (oaiSomeexamplesDiv) {
            docContentAfter += '<div id="doc-section-oai-examples" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Some examples</h3>';
            docContentAfter += oaiSomeexamplesDiv.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div></div>';

        // HR Feed section
        docContentAfter += '<div id="doc-section-hrfeed" class="guide-section" style="margin-bottom: 40px;">';
        docContentAfter += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">HR Feed</h2>';
        docContentAfter += '<div class="markdown-content">';
        if (hrfeedEndpointDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-endpoint" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">HR Feed Private Endpoint</h3>';
            docContentAfter += hrfeedEndpointDiv.innerHTML;
            docContentAfter += '</div>';
        }

        // HR Feed examples subsection with nested content
        docContentAfter += '<div id="doc-section-hrfeed-examples" style="margin-bottom: 30px;">';
        docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">HR Feed examples</h3>';
        if (hrfeedExamplesPythonDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-python" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">Python</h4>';
            docContentAfter += hrfeedExamplesPythonDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (hrfeedExamplesJavaDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-java" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">Java</h4>';
            docContentAfter += hrfeedExamplesJavaDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (hrfeedExamplesCsharpDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-csharp" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">C Sharp</h4>';
            docContentAfter += hrfeedExamplesCsharpDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (hrfeedExamplesCurlDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-curl" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">Curl</h4>';
            docContentAfter += hrfeedExamplesCurlDiv.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div>';

        if (hrfeedResponseDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-response" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Response</h3>';
            docContentAfter += hrfeedResponseDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (hrfeedErrorsDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-errors" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Errors</h3>';
            docContentAfter += hrfeedErrorsDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (hrfeedNotesDiv) {
            docContentAfter += '<div id="doc-section-hrfeed-notes" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Notes</h3>';
            docContentAfter += hrfeedNotesDiv.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div></div>';

        // Custom Fields section
        docContentAfter += '<div id="doc-section-custom-fields" class="guide-section" style="margin-bottom: 40px;">';
        docContentAfter += '<h2 class="guide-section-header" style="font-size: 24px; border-bottom: 2px solid #434f59; padding-bottom: 10px; margin-bottom: 20px;">Custom Fields</h2>';
        docContentAfter += '<div class="markdown-content">';
        if (customFieldsEndpointDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-endpoint" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Custom Fields Private Endpoints</h3>';
            docContentAfter += customFieldsEndpointDiv.innerHTML;
            docContentAfter += '</div>';
        }

        // Custom Fields examples subsection with nested content
        docContentAfter += '<div id="doc-section-custom-fields-examples" style="margin-bottom: 30px;">';
        docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Custom Fields examples</h3>';
        if (customFieldsExamplesPythonDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-python" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">Python</h4>';
            docContentAfter += customFieldsExamplesPythonDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (customFieldsExamplesJavaDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-java" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">Java</h4>';
            docContentAfter += customFieldsExamplesJavaDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (customFieldsExamplesCsharpDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-csharp" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">C Sharp</h4>';
            docContentAfter += customFieldsExamplesCsharpDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (customFieldsExamplesCurlDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-curl" style="margin-bottom: 25px; margin-left: 20px;">';
            docContentAfter += '<h4 style="font-size: 16px; margin-bottom: 12px;">Curl</h4>';
            docContentAfter += customFieldsExamplesCurlDiv.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div>';

        if (customFieldsResponseDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-response" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Response</h3>';
            docContentAfter += customFieldsResponseDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (customFieldsErrorsDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-errors" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Errors</h3>';
            docContentAfter += customFieldsErrorsDiv.innerHTML;
            docContentAfter += '</div>';
        }
        if (customFieldsNotesDiv) {
            docContentAfter += '<div id="doc-section-custom-fields-notes" style="margin-bottom: 30px;">';
            docContentAfter += '<h3 style="font-size: 18px; margin-bottom: 15px;">Notes</h3>';
            docContentAfter += customFieldsNotesDiv.innerHTML;
            docContentAfter += '</div>';
        }
        docContentAfter += '</div></div>';

        docContentAfter += '</div>'; // Close documentation-sections-after

        // Insert docContentBefore at the beginning of swagger-ui-content
        // This will contain: Figshare Documentation, OAuth, API Features
        swaggerWrapper.insertAdjacentHTML('afterbegin', docContentBefore);

        // Insert docContentAfter at the end of swagger-ui-content
        // This will contain: Upload Files, Search, Stats, OAI PMH, HR Feed, Custom Fields
        // This ensures API endpoint documentation (Articles, Authors, Collections, etc.) appears in between
        swaggerWrapper.insertAdjacentHTML('beforeend', docContentAfter);
    }

    // Function to move Schemas/Models section after Custom Fields documentation
    function moveSchemasToEnd() {
        // Wait a bit for Swagger UI to fully render
        setTimeout(function() {
            var swaggerWrapper = document.getElementById('swagger-ui-content');
            if (!swaggerWrapper) return;

            // Find the main swagger-ui wrapper that Swagger UI creates
            var swaggerUIDiv = swaggerWrapper.querySelector('.swagger-ui');
            if (!swaggerUIDiv) {
                // If there's no .swagger-ui wrapper, Swagger UI might render directly
                swaggerUIDiv = swaggerWrapper;
            }

            // Find the models/schemas section (usually has class "models")
            var modelsSection = swaggerUIDiv.querySelector('.models');

            // Also try to find it by looking for sections with "Models" or "Schemas" header
            if (!modelsSection) {
                var allSections = swaggerUIDiv.querySelectorAll('section, .scheme-container');
                for (var i = 0; i < allSections.length; i++) {
                    var section = allSections[i];
                    var header = section.querySelector('h4, h3, h2, .model-title');
                    if (header && (header.textContent.includes('Models') || header.textContent.includes('Schemas'))) {
                        modelsSection = section;
                        break;
                    }
                }
            }

            // If we found the models section, create a new swagger-ui wrapper for it
            if (modelsSection) {
                // Create a wrapper div with swagger-ui class to maintain styling context
                var schemasWrapper = document.createElement('div');
                schemasWrapper.className = 'swagger-ui';
                schemasWrapper.style.padding = '20px';
                schemasWrapper.style.maxWidth = '100%';

                // Move the models section into the new wrapper
                schemasWrapper.appendChild(modelsSection);

                // Append the wrapped schemas to the main content area
                swaggerWrapper.appendChild(schemasWrapper);
            }
        }, 500); // Wait 500ms for Swagger UI to render
    }


    // OAuth2 redirect handling functionality
    function oauth2RedirectRun () {
        var oauth2 = window.opener.swaggerUIRedirectOauth2;
        var sentState = oauth2.state;
        var redirectUrl = oauth2.redirectUrl;
        var isValid, qp, arr;
        if (/code|token|error/.test(window.location.hash)) {
            qp = window.location.hash.substring(1).replace('?', '&');
        } else {
            qp = location.search.substring(1);
        }
        arr = qp.split("&");
        arr.forEach(function (v,i,_arr) { _arr[i] = '"' + v.replace('=', '":"') + '"';});
        qp = qp ? JSON.parse('{' + arr.join() + '}',
                function (key, value) {
                    return key === "" ? value : decodeURIComponent(value);
                }
        ) : {};
        isValid = qp.state === sentState;
        if ((
          oauth2.auth.schema.get("flow") === "accessCode" ||
          oauth2.auth.schema.get("flow") === "authorizationCode" ||
          oauth2.auth.schema.get("flow") === "authorization_code"
        ) && !oauth2.auth.code) {
            if (!isValid) {
                oauth2.errCb({
                    authId: oauth2.auth.name,
                    source: "auth",
                    level: "warning",
                    message: "Authorization may be unsafe, passed state was changed in server."
                });
            }
            if (qp.code) {
                delete oauth2.state;
                oauth2.auth.code = qp.code;
                oauth2.callback({auth: oauth2.auth, redirectUrl: redirectUrl});
            } else {
                let oauthErrorMsg;
                if (qp.error) {
                    oauthErrorMsg = "["+qp.error+"]: " +
                        (qp.error_description ? qp.error_description+ ". " : "no accessCode received. ") +
                        (qp.error_uri ? "More info: "+qp.error_uri : "");
                }
                oauth2.errCb({
                    authId: oauth2.auth.name,
                    source: "auth",
                    level: "error",
                    message: oauthErrorMsg || "[Authorization failed]: no accessCode received."
                });
            }
        } else {
            oauth2.callback({auth: oauth2.auth, token: qp, isValid: isValid, redirectUrl: redirectUrl});
        }
        window.close();
    }

    if (window.opener && window.opener.swaggerUIRedirectOauth2) {
        if (document.readyState !== 'loading') {
            oauth2RedirectRun();
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                oauth2RedirectRun();
            });
        }
    }

    // Wrap fetch to capture API errors and display them in a modal
    (function() {
        var originalFetch = window.fetch;

        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input.url || String(input));

            // Only intercept API calls (not swagger.json or other resources)
            var isApiCall = url.includes('/v2/') && !url.includes('swagger.json');

            if (!isApiCall) {
                return originalFetch.apply(this, arguments);
            }

            return originalFetch.apply(this, arguments)
                .then(function(response) {
                    // Clone response so we can read body and still return original
                    var clone = response.clone();

                    // Check if it's a successful response
                    if (response.ok && response.status >= 200 && response.status < 300) {
                        // Show success modal for successful requests
                        clone.text().then(function(bodyText) {
                            var responseBody = bodyText;
                            try {
                                var parsed = JSON.parse(bodyText);
                                responseBody = JSON.stringify(parsed, null, 2);
                            } catch(e) {}

                            // Get headers
                            var headersObj = {};
                            response.headers.forEach(function(value, key) {
                                headersObj[key] = value;
                            });
                            var headersStr = JSON.stringify(headersObj, null, 2);

                            // Count items in response body
                            var itemCount = '';
                            try {
                                var parsed = JSON.parse(bodyText);
                                if (Array.isArray(parsed)) {
                                    itemCount = ' (' + parsed.length + ')';
                                } else if (typeof parsed === 'object' && parsed !== null) {
                                    itemCount = ' (object)';
                                }
                            } catch(e) {}

                            // Build success message content
                            var content = '<div class="modal-detail">' +
                                '<div class="modal-detail-label">Request URL</div>' +
                                '<div class="modal-detail-value">' + url + '</div>' +
                                '</div>' +
                                '<div class="modal-detail">' +
                                '<div class="modal-detail-label">Response Body' + itemCount + '</div>' +
                                '<pre class="modal-detail-value">' + (responseBody || 'Empty response') + '</pre>' +
                                '</div>' +
                                '<div class="modal-detail">' +
                                '<div class="modal-detail-label">Response Code</div>' +
                                '<div class="modal-detail-value" style="background-color: #d4edda; border-color: #c3e6cb; color: #155724;">' + response.status + ' ' + response.statusText + '</div>' +
                                '</div>' +
                                '<div class="modal-detail">' +
                                '<div class="modal-detail-label">Response Headers</div>' +
                                '<pre class="modal-detail-value">' + headersStr + '</pre>' +
                                '</div>';

                            showUniversalModal({
                                type: 'success',
                                title: 'Request Successful',
                                content: content
                            });
                        }).catch(function(e) {
                            // Could not read response body
                        });
                    }
                    // Check if it's an error response
                    else if (!response.ok || response.status >= 400) {
                        // Read the response body
                        clone.text().then(function(bodyText) {
                            var responseBody = bodyText;
                            try {
                                var parsed = JSON.parse(bodyText);
                                responseBody = JSON.stringify(parsed, null, 2);
                            } catch(e) {}

                            // Get headers
                            var headersObj = {};
                            response.headers.forEach(function(value, key) {
                                headersObj[key] = value;
                            });
                            var headersStr = JSON.stringify(headersObj, null, 2);

                            // Avoid duplicate modals
                            var errorKey = url + response.status + bodyText;
                            if (errorKey !== lastApiErrorShown) {
                                lastApiErrorShown = errorKey;
                                var hint = getHttpErrorHint(response.status);
                                showApiErrorModal(url, response.status, responseBody, headersStr, hint);
                            }
                        }).catch(function(e) {
                            // Could not read response body
                        });
                    }

                    return response;
                })
                .catch(function(error) {
                    // Network error or CORS block - show modal BEFORE re-throwing
                    var errorKey = url + error.message;
                    if (errorKey !== lastApiErrorShown) {
                        lastApiErrorShown = errorKey;

                        var responseCode = 'CORS / Network Error';
                        var errorBody = '';
                        var hint = '';

                        if (error.message === 'Failed to fetch') {
                            // CORS blocked - show N/A for all details
                            responseCode = 'N/A';
                            errorBody = 'N/A';
                            hint = '';
                        } else {
                            errorBody = error.name + ': ' + error.message;
                        }

                        showApiErrorModal(url, responseCode, errorBody, 'N/A (blocked by CORS)', hint);
                    }

                    // Re-throw so Swagger UI can handle it too
                    throw error;
                });
        };
    })();
