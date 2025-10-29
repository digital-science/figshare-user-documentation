/**
 * API Version Management for Swagger Documentation
 * This module handles loading and switching between different API versions
 */

(function() {
    'use strict';

    // Configuration
    var VERSIONS_MANIFEST_URL = 'docs/versions_manifest.json';
    var DEFAULT_SWAGGER_URL = 'swagger.json';
    var versionsData = null;
    var currentVersion = null;

    /**
     * Load versions manifest from the server
     */
    function loadVersionsManifest() {
        return fetch(VERSIONS_MANIFEST_URL)
            .then(function(response) {
                if (!response.ok) {
                    console.warn('Versions manifest not found, using default swagger.json');
                    return null;
                }
                return response.json();
            })
            .then(function(data) {
                versionsData = data;
                return data;
            })
            .catch(function(error) {
                console.error('Error loading versions manifest:', error);
                return null;
            });
    }

    /**
     * Populate the version selector dropdown
     */
    function populateVersionSelector() {
        var select = document.getElementById('apiVersionSelect');
        if (!select) {
            console.warn('Version selector not found in DOM');
            return;
        }

        if (!versionsData || !versionsData.versions) {
            // No versions data, hide the selector
            var versionSelector = select.closest('.version-selector');
            if (versionSelector) {
                versionSelector.style.display = 'none';
            }
            return;
        }

        // Clear existing options
        select.innerHTML = '';

        // Get saved version preference or use default
        var savedVersion = localStorage.getItem('figshare_api_version');
        var selectedVersion = savedVersion || versionsData.default_version;
        
        // Ensure we have a valid selected version
        if (!selectedVersion) {
            selectedVersion = versionsData.default_version;
        }

        // Add options for each version
        versionsData.versions.forEach(function(versionInfo) {
            var option = document.createElement('option');
            option.value = versionInfo.version;
            
            var label = 'v' + versionInfo.version;
            
            // Add status indicators
            if (versionInfo.deprecated) {
                label += ' (Deprecated)';
            }
            if (versionInfo.version === versionsData.default_version) {
                label += ' - Current';
            }
            
            option.textContent = label;
            option.setAttribute('data-deprecated', versionInfo.deprecated || false);
            option.setAttribute('data-description', versionInfo.description || '');
            
            if (versionInfo.sunset) {
                option.setAttribute('data-sunset', versionInfo.sunset);
            }
            if (versionInfo.successor) {
                option.setAttribute('data-successor', versionInfo.successor);
            }
            if (versionInfo.doc_url) {
                option.setAttribute('data-doc-url', versionInfo.doc_url);
            }
            
            // Select this option if it matches saved/default version
            if (versionInfo.version === selectedVersion) {
                option.selected = true;
                currentVersion = versionInfo.version;
            }
            
            select.appendChild(option);
        });

        // Add change event listener
        select.addEventListener('change', handleVersionChange);

        // Ensure the selected version is set (fallback)
        if (currentVersion) {
            select.value = currentVersion;
        }

        // Show deprecation warning if current version is deprecated
        updateDeprecationWarning(selectedVersion);
    }

    /**
     * Handle version selection change
     */
    function handleVersionChange(event) {
        var newVersion = event.target.value;
        var selectedOption = event.target.options[event.target.selectedIndex];
        
        // Save preference
        localStorage.setItem('figshare_api_version', newVersion);
        
        // Update deprecation warning
        updateDeprecationWarning(newVersion);
        
        // Get the swagger file for this version
        var swaggerUrl = getSwaggerUrlForVersion(newVersion);
        
        // Reload Swagger UI with new version
        loadSwaggerUI(swaggerUrl, newVersion);
    }

    /**
     * Get the swagger.json URL for a specific version
     */
    function getSwaggerUrlForVersion(version) {
        if (!versionsData || !versionsData.versions) {
            return DEFAULT_SWAGGER_URL;
        }
        
        var versionInfo = versionsData.versions.find(function(v) {
            return v.version === version;
        });
        
        if (versionInfo && versionInfo.file) {
            return versionInfo.file;
        }
        
        // Fallback to versioned filename pattern
        return 'swagger_v' + version + '.json';
    }

    /**
     * Update the deprecation warning display
     */
    function updateDeprecationWarning(version) {
        var warningEl = document.getElementById('versionDeprecationWarning');
        if (!warningEl || !versionsData) return;

        var versionInfo = versionsData.versions.find(function(v) {
            return v.version === version;
        });

        if (!versionInfo) return;

        if (versionInfo.deprecated) {
            var message = '⚠ This version is deprecated';
            
            if (versionInfo.sunset) {
                message += ' and will be sunset on ' + versionInfo.sunset;
            }
            
            if (versionInfo.successor) {
                message += '. Please migrate to v' + versionInfo.successor;
            }
            
            warningEl.textContent = message;
            warningEl.style.display = 'inline';
            
            // Add link to migration docs if available
            if (versionInfo.doc_url) {
                var link = document.createElement('a');
                link.href = versionInfo.doc_url;
                link.textContent = ' Learn more';
                link.target = '_blank';
                link.style.color = '#d9534f';
                link.style.textDecoration = 'underline';
                link.style.marginLeft = '5px';
                warningEl.appendChild(link);
            }
        } else {
            warningEl.style.display = 'none';
            warningEl.textContent = '';
        }
    }

    /**
     * Load or reload Swagger UI with a specific swagger file
     */
    function loadSwaggerUI(swaggerUrl, version) {
        console.log('Loading Swagger UI with version:', version, 'from', swaggerUrl);
        
        // If window.ui exists, we can update the spec
        if (window.ui && typeof window.ui.specActions !== 'undefined') {
            // Update the spec dynamically
            fetch(swaggerUrl)
                .then(function(response) { return response.json(); })
                .then(function(spec) {
                    // Reset internal operations cache so it rebuilds for new spec
                    if (window.internalOperationsCache !== undefined) {
                        window.internalOperationsCache = null;
                    }
                    window.ui.specActions.updateSpec(JSON.stringify(spec));
                    currentVersion = version;
                    console.log('Updated to version:', version);

                    // Wait for Swagger UI to re-render, then rebuild the sidebar
                    setTimeout(function() {
                        // Filter internal operations for new spec
                        if (typeof filterInternalOperations === 'function') {
                            filterInternalOperations();
                        }

                        // Rebuild the dynamic sidebar menu from the new spec
                        if (window.buildDynamicSidebarMenu && typeof window.buildDynamicSidebarMenu === 'function') {
                            window.buildDynamicSidebarMenu();
                        }

                        // Re-initialize sidebar navigation to bind events to new elements
                        if (window.initializeSidebarNavigation && typeof window.initializeSidebarNavigation === 'function') {
                            window.initializeSidebarNavigation();
                        }
                    }, 800);
                })
                .catch(function(error) {
                    console.error('Error loading swagger spec:', error);
                    showVersionError(version, error);
                });
        } else {
            // UI not initialized yet - reload the page with version parameter
            window.location.href = window.location.pathname + '?version=' + version;
        }
    }

    /**
     * Regenerate the API menu based on the loaded swagger specification
     */
    function regenerateMenu(spec) {
        // Delegate to the global buildDynamicSidebarMenu which reads the spec
        // directly from Swagger UI and handles insertion/cleanup
        if (window.buildDynamicSidebarMenu && typeof window.buildDynamicSidebarMenu === 'function') {
            window.buildDynamicSidebarMenu();
        } else {
            console.warn('buildDynamicSidebarMenu not available');
        }

        // Re-initialize sidebar navigation to bind events to new menu items
        if (window.initializeSidebarNavigation && typeof window.initializeSidebarNavigation === 'function') {
            window.initializeSidebarNavigation();
        }

        // Re-apply any active search filter to the new menu
        var searchInput = document.getElementById('SearchDocInput');
        if (searchInput && searchInput.value) {
            filterMenuBySearch(searchInput.value.toLowerCase().trim());
        }
    }
    
    /**
     * Filter menu items based on search query
     */
    function filterMenuBySearch(query) {
        var menuContainer = document.querySelector('.api-sidebar ul');
        if (!menuContainer) return;
        
        // Get all menu items with data-tag (API sections)
        var menuItems = menuContainer.querySelectorAll('li');
        
        menuItems.forEach(function(li) {
            var parentLink = li.querySelector('.parent-link');
            if (!parentLink || !parentLink.hasAttribute('data-tag')) {
                // This is a static section or other item - don't filter it
                return;
            }
            
            if (!query) {
                // No search query - show everything
                li.style.display = '';
                var submenu = li.querySelector('ul');
                if (submenu) {
                    var childLinks = submenu.querySelectorAll('li');
                    childLinks.forEach(function(child) {
                        child.style.display = '';
                    });
                }
                return;
            }
            
            // Check if tag name matches
            var tagName = parentLink.textContent.toLowerCase();
            var tagMatches = tagName.includes(query);
            
            // Check if any child operation matches
            var submenu = li.querySelector('ul');
            var anyChildMatches = false;
            
            if (submenu) {
                var childLinks = submenu.querySelectorAll('li a');
                childLinks.forEach(function(childLink) {
                    var operationName = childLink.textContent.toLowerCase();
                    var matchesQuery = operationName.includes(query);
                    
                    if (matchesQuery || tagMatches) {
                        childLink.parentElement.style.display = '';
                        anyChildMatches = true;
                    } else {
                        childLink.parentElement.style.display = 'none';
                    }
                });
            }
            
            // Show parent if tag matches or any child matches
            if (tagMatches || anyChildMatches) {
                li.style.display = '';
                // Expand submenu if search matches
                if (submenu && submenu.classList.contains('collapsed')) {
                    submenu.classList.remove('collapsed');
                }
            } else {
                li.style.display = 'none';
            }
        });
    }
    
    /**
     * Show error when version fails to load
     */
    function showVersionError(version, error) {
        var warningEl = document.getElementById('versionDeprecationWarning');
        if (warningEl) {
            warningEl.textContent = '❌ Failed to load version ' + version + ': ' + error.message;
            warningEl.style.display = 'inline';
            warningEl.style.color = '#d9534f';
        }
    }

    /**
     * Get version from URL parameter if present
     */
    function getVersionFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return params.get('version');
    }

    /**
     * Initialize version management system
     */
    function initializeVersionManagement() {
        // Check if there's a version in the URL
        var urlVersion = getVersionFromUrl();
        if (urlVersion) {
            localStorage.setItem('figshare_api_version', urlVersion);
        }

        // Load versions manifest and populate selector
        loadVersionsManifest().then(function(data) {
            if (data) {
                populateVersionSelector();
                console.log('Version management initialized with', data.versions.length, 'versions');
            } else {
                console.log('No version manifest found - running in single-version mode');
                // Hide version selector if no manifest
                var versionSelector = document.querySelector('.version-selector');
                if (versionSelector) {
                    versionSelector.style.display = 'none';
                }
            }
        });
    }

    /**
     * Get the initial swagger URL based on saved/default version
     */
    function getInitialSwaggerUrl() {
        var savedVersion = localStorage.getItem('figshare_api_version');
        var urlVersion = getVersionFromUrl();
        
        if (urlVersion) {
            return 'swagger_v' + urlVersion + '.json';
        } else if (savedVersion && versionsData) {
            return getSwaggerUrlForVersion(savedVersion);
        }
        
        return DEFAULT_SWAGGER_URL;
    }

    // Public API
    window.FigshareVersionManager = {
        initialize: initializeVersionManagement,
        getCurrentVersion: function() { return currentVersion; },
        getVersionsData: function() { return versionsData; },
        loadVersion: loadSwaggerUI,
        getInitialSwaggerUrl: getInitialSwaggerUrl,
        toggleSubmenu: toggleSubmenu,
        filterMenuBySearch: filterMenuBySearch,
        regenerateMenu: regenerateMenu
    };

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeVersionManagement);
    } else {
        initializeVersionManagement();
    }

})();
