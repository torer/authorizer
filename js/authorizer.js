var animation_speed = 300;
var shake_speed = 600;



// Switch between option tabs.
function choose_tab( list_name, delay ) {
	var $ = jQuery;

	// default delay is 0
	delay = typeof delay !== 'undefined' ? delay : 0;

	// default to the access list tab
	list_name = typeof list_name !== 'undefined' ? list_name : 'access_lists';

	// Hide all tab content, then show selected tab content
	$( 'div.section_info, div.section_info + table' ).hide();
	$( '#section_info_' + list_name + ', #section_info_' + list_name + ' + table' ).show();

	// Set active tab
	$( '.nav-tab-wrapper a' ).removeClass( 'nav-tab-active' );
	$( 'a.nav-tab-' + list_name ).addClass( 'nav-tab-active' );

	// Hide site options if they are overridden by a multisite setting.
	setTimeout( hide_multisite_overridden_options, delay );

	// Hide Save Changes button if we're on the access lists page (changing
	// access lists saves automatically via AJAX).
	$( 'body:not(.network-admin) #submit' ).toggle( list_name !== 'access_lists' );

	// Save user's active tab to sessionStorage (so we can restore it on reload).
	// Note: session storage persists until the browser tab is closed.
	sessionStorage.setItem( 'tab', list_name );
}

// Switch between pages in the Approved User list.
function refresh_approved_user_list( currentPage, searchTerm ) {
	var $ = jQuery;
	var $list = $( '#list_auth_settings_access_users_approved' );
	var $spinner = $( '<span class="spinner is-active"></span>' ).css({
		'position': 'relative',
		'top': '45%',
		'left': '-240px',
	});
	var $overlay = $( '<div id="list_auth_settings_access_users_approved_overlay"></div>' ).css({
		'background-color': '#f1f1f1',
		'z-index': 1,
		'opacity': 0.8,
		'position': 'absolute',
		'top': $list.position().top,
		'left': $list.position().left,
		'width': $list.width(),
		'height': $list.height(),
	});
	$overlay.append( $spinner );

	// Show overlay and wait cursor.
	$list.after( $overlay );
	$( 'html' ).addClass( 'busy' );

	$.post( ajaxurl, {
		'action': 'refresh_approved_user_list',
		'nonce_save_auth_settings': $( '#nonce_save_auth_settings' ).val(),
		'is_network_admin': auth_L10n.is_network_admin,
		'paged': currentPage,
		'search': searchTerm,
	}, function( response ) {
		if ( response.success ) {
			// Update user list and total user and page count.
			$( '#list_auth_settings_access_users_approved' ).html( response.html );
			$( '.displaying-num' ).html( response.total_users_html );
			$( '.total-pages' ).html( response.total_pages_html );

			// Adjust our current page if the query changed the total page count.
			if ( currentPage > response.total_pages ) {
				currentPage = response.total_pages;
			}

			// Update pager elements.
			refresh_approved_user_pager( currentPage );

			// Update querystring with new paged param value (but don't reload the page).
			if ( history.pushState ) {
				var url = window.location.href;
				url = updateQueryStringParameter( url, 'paged', currentPage );
				url = updateQueryStringParameter( url, 'search', searchTerm );
				window.history.pushState( { path: url }, '', url );
			}
		}
		// Remove overlay and wait cursor.
		$overlay.remove();
		$( 'html' ).removeClass( 'busy' );
	}).fail( function() {
		// Remove overlay and wait cursor.
		$overlay.remove();
		$( 'html' ).removeClass( 'busy' );
	});
}

// Update the pager elements when changing pages.
function refresh_approved_user_pager( currentPage ) {
	var $ = jQuery;
	var totalPages = parseInt( $( '.total-pages' ).first().text().replace( /[^0-9]/g, '' ) ) || 1;

	// If total number of pages changed (because a search filter reduced it), make
	// sure current page is not larger than it.
	if ( currentPage > totalPages ) {
		currentPage = totalPages;
	}
	if ( currentPage < 1 ) {
		currentPage = 1;
	}
	if ( totalPages < 1 ) {
		totalPages = 1;
	}

	// Update current page text input.
	$( '#current-page-selector' ).val( currentPage );

	// Update current page span.
	$( '#table-paging .current-page-text' ).text( currentPage );

	// Update first page button.
	var $first = $( '.first-page' );
	if ( $first.is( 'a' ) && currentPage <= 1 ) {
		$first.replaceWith( '<span class="first-page tablenav-pages-navspan" aria-hidden="true">&laquo;</span>' );
	} else if ( $first.is( 'span' ) && currentPage > 1 ) {
		$first.replaceWith( '<a class="first-page" href="' + updateQueryStringParameter( window.location.href, 'paged', '1' ) + '"><span class="screen-reader-text">' + auth_L10n.first_page + '</span><span aria-hidden="true">&laquo;</span></a>' );
	}

	// Update prev page button.
	var $prev = $( '.prev-page' );
	if ( $prev.is( 'a' ) && currentPage <= 1 ) {
		$prev.replaceWith( '<span class="prev-page tablenav-pages-navspan" aria-hidden="true">&lsaquo;</span>' );
	} else if ( currentPage > 1 ) {
		$prev.replaceWith( '<a class="prev-page" href="' + updateQueryStringParameter( window.location.href, 'paged', currentPage - 1 ) + '"><span class="screen-reader-text">' + auth_L10n.prev_page + '</span><span aria-hidden="true">&lsaquo;</span></a>' );
	}

	// Update next button.
	var $next = $( '.next-page' );
	if ( $next.is( 'a' ) && currentPage >= totalPages ) {
		$next.replaceWith( '<span class="next-page tablenav-pages-navspan" aria-hidden="true">&rsaquo;</span>' );
	} else if ( currentPage < totalPages ) {
		$next.replaceWith( '<a class="next-page" href="' + updateQueryStringParameter( window.location.href, 'paged', currentPage + 1 ) + '"><span class="screen-reader-text">' + auth_L10n.next_page + '</span><span aria-hidden="true">&rsaquo;</span></a>' );
	}

	// Update last button.
	var $last = $( '.last-page' );
	if ( $last.is( 'a' ) && currentPage >= totalPages ) {
		$last.replaceWith( '<span class="last-page tablenav-pages-navspan" aria-hidden="true">&raquo;</span>' );
	} else if ( $last.is( 'span' ) && currentPage < totalPages ) {
		$last.replaceWith( '<a class="last-page" href="' + updateQueryStringParameter( window.location.href, 'paged', totalPages ) + '"><span class="screen-reader-text">' + auth_L10n.next_page + '</span><span aria-hidden="true">&raquo;</span></a>' );
	}
}

// Update user's usermeta field.
function auth_update_usermeta( caller ) {
	var $ = jQuery,
		$caller = $( caller ),
		$usermeta = $caller.parent().children( '.auth-usermeta' ),
		email = $caller.siblings( '.auth-email' ).val(),
		usermeta = $usermeta.val(),
		nonce_save_auth_settings = $( '#nonce_save_auth_settings' ).val();

	// Remove reference to caller if it's the usermeta field itself (not a button triggering the save).
	if ( $caller.hasClass( 'auth-usermeta' ) ) {
		$caller = $();
	}

	// Disable inputs, show spinner.
	$caller.attr( 'disabled', 'disabled' );
	$usermeta.attr( 'disabled', 'disabled' );
	var $row = $usermeta.closest( 'li' );
	var $spinner = $( '<span class="spinner is-active"></span>' ).css({
		'position': 'absolute',
		'top': $row.position().top,
		'left': $row.position().left + $row.width(),
	});
	$usermeta.after( $spinner );
	$( 'html' ).addClass( 'busy' );

	// Call ajax save function.
	$.post( ajaxurl, {
		'action': 'update_auth_usermeta',
		'email': email,
		'usermeta': usermeta,
		'nonce_save_auth_settings': nonce_save_auth_settings,
	}, function ( response ) {
		var succeeded = response === 'success';
		var spinner_text = succeeded ? auth_L10n.saved + '.' : '<span style="color: red;">' + auth_L10n.failed + '.</span>';
		var spinner_wait = succeeded ? 500 : 2000;

		// Enable inputs, remove spinner.
		$caller.removeAttr( 'disabled' );
		$usermeta.removeAttr( 'disabled' );
		$caller.css( 'display', 'none' );
		$( 'form .spinner:not(:has(.spinner-text))' ).animate( { width: '60px' }, 'fast' ).append( '<span class="spinner-text">' +  spinner_text + '</span>' ).delay( spinner_wait ).hide( animation_speed, function() {
			$( this ).remove();
		});
		$( 'html' ).removeClass( 'busy' );

	}).fail( function ( response ) {
		var succeeded = false;
		var spinner_text = succeeded ? auth_L10n.saved + '.' : '<span style="color: red;">' + auth_L10n.failed + '.</span>';
		var spinner_wait = succeeded ? 500 : 2000;

		// Enable inputs, remove spinner.
		$caller.removeAttr( 'disabled' );
		$usermeta.removeAttr( 'disabled' );
		$caller.css( 'display', 'none' );
		$( 'form .spinner:not(:has(.spinner-text))' ).animate( { width: '60px' }, 'fast' ).append( '<span class="spinner-text">' +  spinner_text + '</span>' ).delay( spinner_wait ).hide( animation_speed, function() {
			$( this ).remove();
		});
		$( 'html' ).removeClass( 'busy' );

	});

}

// Update user's role (multisite options page).
function auth_multisite_change_role( caller ) {
	var is_multisite = true;
	auth_change_role( caller, is_multisite );
}

// Update user's role.
function auth_change_role( caller, is_multisite ) {
	var $ = jQuery;

	// Set default for multisite flag (run different save routine if multisite)
	is_multisite = typeof is_multisite !== 'undefined' ? is_multisite : false;

	var email = $( caller ).parent().find( '.auth-email' );
	var role = $( caller ).parent().find( '.auth-role' );
	var date_added = $( caller ).parent().find( '.auth-date-added' );

	var user = {
		'email': email.val(),
		'role': role.val(),
		'date_added': date_added.val(),
		'edit_action': 'change_role',
		'multisite_user': is_multisite,
	};

	// Update the options in the database with this change.
	update_auth_user( caller, 'access_users_approved', user );

	return true;
}

// Add user to list (multisite options page).
function auth_multisite_add_user( caller, list, create_local_account ) {
	var is_multisite = true;

	// Default to the approved list.
	list = typeof list !== 'undefined' ? list : 'approved';

	// Default to not creating a local account.
	create_local_account = typeof create_local_account !== 'undefined' ? create_local_account : false;

	// There currently is no multisite blocked list, so do nothing.
	if ( list === 'blocked' ) {
		return;
	}

	auth_add_user( caller, list, create_local_account, is_multisite );
}
// Add user to list (list = blocked or approved).
function auth_add_user( caller, list, create_local_account, is_multisite ) {
	var $ = jQuery;

	// Skip email address validation if adding from pending list (not user-editable).
	var skip_validation = $( caller ).parent().parent().attr( 'id' ) === 'list_auth_settings_access_users_pending';

	// Skip email address validation if we're banning an existing user (since they're already in a list).
	skip_validation = skip_validation || $( caller ).attr( 'id' ).indexOf( 'block_user' ) > -1;

	// Set default for multisite flag (run different save routine if multisite)
	is_multisite = typeof is_multisite !== 'undefined' ? is_multisite : false;

	// Default to the approved list.
	list = typeof list !== 'undefined' ? list : 'approved';

	// Default to not creating a local account.
	create_local_account = typeof create_local_account !== 'undefined' ? create_local_account : false;

	var email = $( caller ).parent().find( '.auth-email' );
	var role = $( caller ).parent().find( '.auth-role' );
	var date_added = $( caller ).parent().find( '.auth-date-added' );

	// Helper variable for disabling buttons while processing. This will be
	// set differently if our clicked button is nested in a div (below).
	var buttons = caller;

	// Button (caller) might be nested in a div, so we need to walk up one more level
	if ( email.length === 0 || role.length === 0 ) {
		email = $( caller ).parent().parent().find( '.auth-email' );
		role = $( caller ).parent().parent().find( '.auth-role' );
		date_added = $( caller ).parent().parent().find( '.auth-date-added' );
		buttons = $( caller ).parent().children();
	}

	// Support a single email address, or multiple (separated by newlines, commas, semicolons, or spaces).
	var emails = $.trim( email.val() ).replace( /mailto:/g, '' ).split( /[\s,;]+/ );

	// Remove any invalid email addresses.
	if ( ! skip_validation ) {
		// Check if the email(s) being added is well-formed.
		emails = emails.filter( function ( email ) {
			return valid_email( email );
		});
		// Remove any duplicates in the list of emails to add.
		emails = remove_duplicates_from_array_of_strings( emails );
	}

	// Shake and quit if no valid email addresses exist.
	if ( emails.length < 1 ) {
		$( '#new_' + list + '_user_email' ).parent().effect( 'shake', shake_speed );
		return false;
	}

	$( buttons ).attr( 'disabled', 'disabled' );

	var users = [];
	for ( var i = 0; i < emails.length; i++ ) {
		var user = {
			'email': emails[i],
			'role': role.val(),
			'date_added': date_added.val(),
			'edit_action': 'add',
			'local_user': create_local_account,
			'multisite_user': is_multisite,
		};
		users.push( user );

		// Get next highest user ID.
		var next_id = 1 + Math.max.apply(
			null,
			$( '#list_auth_settings_access_users_' + list + ' li .auth-email' ).map( function ( el, index ) {
				return parseInt( this.id.replace( 'auth_multisite_settings_access_users_' + list + '_', '' ).replace( 'auth_settings_access_users_' + list + '_', '' ) );
			})
		);

		// Add the new item.
		var auth_js_prefix = is_multisite ? 'auth_multisite_' : 'auth_';
		var local_icon = create_local_account ? '&nbsp;<a title="' + auth_L10n.local_wordpress_user + '" class="auth-local-user"><span class="glyphicon glyphicon-user"></span></a>' : '';
		var ban_button = list === 'approved' && ! is_multisite ? '<a class="button" id="block_user_' + next_id + '" onclick="' + auth_js_prefix + 'add_user( this, \'blocked\', false ); ' + auth_js_prefix + 'ignore_user( this, \'approved\' );" title="' + auth_L10n.block_ban_user + '"><span class="glyphicon glyphicon-ban-circle"></span></a>' : '';
		$( ' \
			<li id="new_user_' + next_id + '" class="new-user" style="display: none;"> \
				<input type="text" id="auth_settings_access_users_' + list + '_' + next_id + '" name="auth_settings[access_users_' + list + '][' + next_id + '][email]" value="' + user.email + '" readonly="true" class="auth-email" /> \
				<select name="auth_settings[access_users_' + list + '][' + next_id + '][role]" class="auth-role" onchange="' + auth_js_prefix + 'change_role( this );"> \
				</select> \
				<input type="text" name="auth_settings[access_users_' + list + '][' + next_id + '][date_added]" value="' + getShortDate() + '" readonly="true" class="auth-date-added" /> \
				' + ban_button + ' \
				<a class="button" id="ignore_user_' + next_id + '" onclick="' + auth_js_prefix + 'ignore_user( this, \'' + list + '\' );" title="' + auth_L10n.remove_user + '"><span class="glyphicon glyphicon-remove"></span></a> \
				' + local_icon + ' \
				<span class="spinner is-active"></span> \
			</li> \
		' ).appendTo( '#list_auth_settings_access_users_' + list + '' ).slideDown( 250 );

		// Populate the role dropdown in the new element. Because clone() doesn't
		// save selected state on select elements, set that too.
		$( 'option', role ).clone().appendTo( '#new_user_' + next_id + ' .auth-role' );
		$( '#new_user_' + next_id + ' .auth-role' ).val( role.val() );
	}

	// Remove the 'empty list' item if it exists.
	$( '#list_auth_settings_access_users_' + list + ' li.auth-empty' ).remove();

	// Update the options in the database with this change.
	update_auth_user( buttons, 'access_users_' + list, users );

	// Reset the new user textboxes
	if ( email.hasClass( 'new' ) ) {
		email.val( '' ).keydown();
	}

	// Re-enable the action buttons now that we're done saving.
	$( buttons ).removeAttr( 'disabled' );
	return true;
}

// Remove user from list (multisite options page).
function auth_multisite_ignore_user( caller, list_name ) {
	var is_multisite = true;

	// Set default list if not provided.
	list_name = typeof list_name !== 'undefined' ? list_name : '';

	auth_ignore_user( caller, list_name, is_multisite );
}
// Remove user from list.
function auth_ignore_user( caller, list_name, is_multisite ) {
	var $ = jQuery;

	// Set default for multisite flag (run different save routine if multisite)
	is_multisite = typeof is_multisite !== 'undefined' ? is_multisite : false;

	// Set default list if not provided.
	list_name = typeof list_name !== 'undefined' ? list_name : 'approved';

	var email = $( caller ).parent().find( '.auth-email' );

	var user = {
		'email': email.val(),
		'role': '',
		'date_added': '',
		'edit_action': 'remove',
		'multisite_user': is_multisite,
	};

	// Show an 'empty list' message if we're deleting the last item
	var list = $( caller ).closest( 'ul' );
	if ( $( 'li', list ).length <= 1 ) {
		$( list ).append( '<li class="auth-empty"><em>' + auth_L10n.no_users_in + ' ' + list_name + '</em></li>' );
	}

	$( caller ).parent().slideUp( 250, function() {
		// Remove the list item.
		$( this ).remove();

		// Update the options in the database with this change.
		update_auth_user( caller, 'access_users_' + list_name, user );
	});
}


// Make changes to one of the user lists (pending, approved, blocked) via ajax.
function update_auth_user( caller, setting, users_to_edit ) {
	var $ = jQuery,
		access_users_pending = [],
		access_users_approved = [],
		access_users_blocked = [],
		nonce_save_auth_settings = $( '#nonce_save_auth_settings' ).val();

	// Defaults:
	// setting = 'access_users_pending' or 'access_users_approved' or 'access_users_blocked',
	// users_to_edit = [
	// 	{
	//    email: 'johndoe@example.com',
	//    role: 'subscriber',
	//    date_added: 'Jun 2014',
	//    edit_action: 'add' or 'remove' or 'change_role',
	//    local_user: true or false,
	//    multisite_user: true or false,
	//  }, {
	//   ...
	//  }
	// ]
	setting = typeof setting !== 'undefined' ? setting : 'none';

	// If we are only editing a single user, make that user the only item in the array.
	users_to_edit = typeof users_to_edit !== 'undefined' ? users_to_edit : [];
	if ( ! Array.isArray( users_to_edit ) ) {
		users_to_edit = [ users_to_edit ];
	}

	// Enable wait cursor.
	$( 'html' ).addClass( 'busy' );

	// Disable button (prevent duplicate clicks).
	$( caller ).attr( 'disabled', 'disabled' );

	// Enable spinner by element that triggered this event (caller).
	var $row = $( caller ).closest( 'li' );
	if ( $row.length > 0 ) {
		var $spinner = $( '<span class="spinner is-active"></span>' ).css({
			'position': 'absolute',
			'top': $row.position().top,
			'left': $row.position().left + $row.width(),
		});
		$row.append( $spinner );
	}

	// Grab the value of the setting we are saving.
	if ( setting === 'access_users_pending' ) {
		access_users_pending = users_to_edit;
	} else if ( setting === 'access_users_approved' ) {
		access_users_approved = users_to_edit;
	} else if ( setting === 'access_users_blocked' ) {
		access_users_blocked = users_to_edit;
	}

	$.post( ajaxurl, {
		'action': 'update_auth_user',
		'setting': setting,
		'access_users_pending': access_users_pending,
		'access_users_approved': access_users_approved,
		'access_users_blocked': access_users_blocked,
		'nonce_save_auth_settings': nonce_save_auth_settings,
	}, function( response ) {
		// Server responded, but if success isn't true it failed to save.
		var succeeded = response.success;
		var spinner_text = succeeded ? auth_L10n.saved + '.' : '<span style="color: red;">' + auth_L10n.failed + '.</span>';
		var spinner_wait = succeeded ? 500 : 2000;

		// Remove any new user entries that were rejected by the server.
		if ( response.invalid_emails.length > 0 ) {
			for ( var i = 0; i < response.invalid_emails.length; i++ ) {
				var duplicate_email = response.invalid_emails[i];
				$( 'li.new-user .auth-email[value="' + duplicate_email + '"]' )
					.siblings( '.spinner' ).addClass( 'duplicate' ).append( '<span class="spinner-text" style="color: red;">' +  auth_L10n.duplicate + '.</span>' )
					.parent().fadeOut( spinner_wait, function () { $( this ).remove(); });
			}
		}

		// Show message ('Saved', 'Failed', or 'Saved, removing duplicates').
		$( 'form .spinner:not(:has(.spinner-text)):not(.duplicate)' ).append( '<span class="spinner-text">' +  spinner_text + '</span>' ).delay( spinner_wait ).hide( animation_speed, function() {
			$( this ).remove();
		});
		$( caller ).removeAttr( 'disabled' );

		// Disable wait cursor.
		$( 'html' ).removeClass( 'busy' );
	}).fail( function() {
		// Fail fires if the server doesn't respond or responds with 500 codes
		var succeeded = false;
		var spinner_text = succeeded ? auth_L10n.saved + '.' : '<span style="color: red;">' + auth_L10n.failed + '.</span>';
		var spinner_wait = succeeded ? 500 : 2000;
		$( 'form .spinner:not(:has(.spinner-text))' ).append( '<span class="spinner-text">' +  spinner_text + '</span>' ).delay( spinner_wait ).hide( animation_speed, function() {
			$( this ).remove();
		});
		$( caller ).removeAttr( 'disabled' );

		// Disable wait cursor.
		$( 'html' ).removeClass( 'busy' );
	});
}


// Multisite functions
function save_auth_multisite_settings( caller ) {
	var $ = jQuery;

	// Enable wait cursor.
	$( 'html' ).addClass( 'busy' );

	// Disable button (prevent duplicate clicks).
	$( caller ).attr( 'disabled', 'disabled' );

	// Enable spinner by element that triggered this event (caller).
	var $spinner = $( '<span class="spinner is-active"></span>' ).css({
		'position': 'absolute',
		'top': $( caller ).position().top,
		'left': $( caller ).position().left + $( caller ).width() + 20,
	});
	$( caller ).after( $spinner );

	// Get form elements to save

	var nonce_save_auth_settings = $( '#nonce_save_auth_settings' ).val();

	var multisite_override = $( '#auth_settings_multisite_override' ).is( ':checked' ) ? '1' : '';

	var access_who_can_login = $( 'form input[name="auth_settings[access_who_can_login]"]:checked' ).val();

	var access_who_can_view = $( 'form input[name="auth_settings[access_who_can_view]"]:checked' ).val();

	var access_users_approved = {};
	$( '#list_auth_settings_access_users_approved li' ).each( function( index ) {
		var user = {};
		user.email = $( '.auth-email', this ).val();
		user.role = $( '.auth-role', this ).val();
		user.date_added = $( '.auth-date-added', this ).val();
		user.local_user = $( '.auth-local-user', this ).length !== 0;
		access_users_approved[index] = user;
	});

	var access_default_role = $( '#auth_settings_access_default_role' ).val();

	var google = $( '#auth_settings_google' ).is( ':checked' ) ? '1' : '';
	var google_clientid = $( '#auth_settings_google_clientid' ).val();
	var google_clientsecret = $( '#auth_settings_google_clientsecret' ).val();
	var google_hosteddomain = $( '#auth_settings_google_hosteddomain' ).val();

	var cas = $( '#auth_settings_cas' ).is( ':checked' ) ? '1' : '';
	var cas_custom_label = $( '#auth_settings_cas_custom_label' ).val();
	var cas_host = $( '#auth_settings_cas_host' ).val();
	var cas_port = $( '#auth_settings_cas_port' ).val();
	var cas_path = $( '#auth_settings_cas_path' ).val();
	var cas_version = $( '#auth_settings_cas_version' ).val();
	var cas_attr_email = $( '#auth_settings_cas_attr_email' ).val();
	var cas_attr_first_name = $( '#auth_settings_cas_attr_first_name' ).val();
	var cas_attr_last_name = $( '#auth_settings_cas_attr_last_name' ).val();
	var cas_attr_update_on_login = $( '#auth_settings_cas_attr_update_on_login' ).is( ':checked' ) ? '1' : '';
	var cas_auto_login = $( '#auth_settings_cas_auto_login' ).is( ':checked' ) ? '1' : '';

	var ldap = $( '#auth_settings_ldap' ).is( ':checked' ) ? '1' : '';
	var ldap_host = $( '#auth_settings_ldap_host' ).val();
	var ldap_port = $( '#auth_settings_ldap_port' ).val();
	var ldap_search_base = $( '#auth_settings_ldap_search_base' ).val();
	var ldap_uid = $( '#auth_settings_ldap_uid' ).val();
	var ldap_attr_email = $( '#auth_settings_ldap_attr_email' ).val();
	var ldap_user = $( '#auth_settings_ldap_user' ).val();
	var ldap_password = $( '#auth_settings_ldap_password' ).val();
	var ldap_tls = $( '#auth_settings_ldap_tls' ).is( ':checked' ) ? '1' : '';
	var ldap_lostpassword_url = $( '#auth_settings_ldap_lostpassword_url' ).val();
	var ldap_attr_first_name = $( '#auth_settings_ldap_attr_first_name' ).val();
	var ldap_attr_last_name = $( '#auth_settings_ldap_attr_last_name' ).val();
	var ldap_attr_update_on_login = $( '#auth_settings_ldap_attr_update_on_login' ).is( ':checked' ) ? '1' : '';

	var advanced_lockouts = {
		'attempts_1': $( '#auth_settings_advanced_lockouts_attempts_1' ).val(),
		'duration_1': $( '#auth_settings_advanced_lockouts_duration_1' ).val(),
		'attempts_2': $( '#auth_settings_advanced_lockouts_attempts_2' ).val(),
		'duration_2': $( '#auth_settings_advanced_lockouts_duration_2' ).val(),
		'reset_duration': $( '#auth_settings_advanced_lockouts_reset_duration' ).val()
	};
	var advanced_hide_wp_login = $( '#auth_settings_advanced_hide_wp_login' ).is( ':checked' ) ? '1' : '';
	var advanced_widget_enabled = $( '#auth_settings_advanced_widget_enabled' ).is( ':checked' ) ? '1' : '';
	var advanced_users_per_page = $( '#auth_settings_advanced_users_per_page' ).val();
	var advanced_users_sort_by = $( '#auth_settings_advanced_users_sort_by' ).val();
	var advanced_users_sort_order = $( '#auth_settings_advanced_users_sort_order' ).val();

	$.post( ajaxurl, {
		action: 'save_auth_multisite_settings',
		'nonce_save_auth_settings': nonce_save_auth_settings,
		'multisite_override': multisite_override,
		'access_who_can_login': access_who_can_login,
		'access_who_can_view': access_who_can_view,
		'access_users_approved': access_users_approved,
		'access_default_role': access_default_role,
		'google': google,
		'google_clientid': google_clientid,
		'google_clientsecret': google_clientsecret,
		'google_hosteddomain': google_hosteddomain,
		'cas': cas,
		'cas_custom_label': cas_custom_label,
		'cas_host': cas_host,
		'cas_port': cas_port,
		'cas_path': cas_path,
		'cas_version': cas_version,
		'cas_attr_email': cas_attr_email,
		'cas_attr_first_name': cas_attr_first_name,
		'cas_attr_last_name': cas_attr_last_name,
		'cas_attr_update_on_login': cas_attr_update_on_login,
		'cas_auto_login': cas_auto_login,
		'ldap': ldap,
		'ldap_host': ldap_host,
		'ldap_port': ldap_port,
		'ldap_search_base': ldap_search_base,
		'ldap_uid': ldap_uid,
		'ldap_attr_email': ldap_attr_email,
		'ldap_user': ldap_user,
		'ldap_password': ldap_password,
		'ldap_tls': ldap_tls,
		'ldap_lostpassword_url': ldap_lostpassword_url,
		'ldap_attr_first_name': ldap_attr_first_name,
		'ldap_attr_last_name': ldap_attr_last_name,
		'ldap_attr_update_on_login': ldap_attr_update_on_login,
		'advanced_lockouts': advanced_lockouts,
		'advanced_hide_wp_login': advanced_hide_wp_login,
		'advanced_users_per_page': advanced_users_per_page,
		'advanced_users_sort_by': advanced_users_sort_by,
		'advanced_users_sort_order': advanced_users_sort_order,
		'advanced_widget_enabled': advanced_widget_enabled,
	}, function( response ) {
		var succeeded = response === 'success';
		var spinner_text = succeeded ? auth_L10n.saved + '.' : '<span style="color: red;">' + auth_L10n.failed + '.</span>';
		var spinner_wait = succeeded ? 500 : 2000;
		$( 'form .spinner:not(:has(.spinner-text))' ).append( '<span class="spinner-text">' +  spinner_text + '</span>' ).delay( spinner_wait ).hide( animation_speed, function() {
			$( this ).remove();
		});
		$( caller ).removeAttr( 'disabled' );

		// Disable wait cursor.
		$( 'html' ).removeClass( 'busy' );
	}).fail( function() {
		// Fail fires if the server doesn't respond
		var succeeded = false;
		var spinner_text = succeeded ? auth_L10n.saved + '.' : '<span style="color: red;">' + auth_L10n.failed + '.</span>';
		var spinner_wait = succeeded ? 500 : 2000;
		$( 'form .spinner:not(:has(.spinner-text))' ).append( '<span class="spinner-text">' +  spinner_text + '</span>' ).delay( spinner_wait ).hide( animation_speed, function() {
			$( this ).remove();
		});
		$( caller ).removeAttr( 'disabled' );

		// Disable wait cursor.
		$( 'html' ).removeClass( 'busy' );
	});
}

// Hide or show (with overlay) the multisite settings based on the "multisite override" setting.
function hide_multisite_settings_if_disabled() {
	var $ = jQuery;

	if ( $( '#auth_settings_multisite_override' ).length === 0 )
		return;

	var settings = $( '#auth_multisite_settings' );
	var overlay = $( '#auth_multisite_settings_disabled_overlay' );

	if ( $( '#auth_settings_multisite_override' ).is( ':checked' ) ) {
		overlay.hide( animation_speed );
	} else {
		overlay.css({
			'background-color': '#f1f1f1',
			'z-index': 1,
			'opacity': 0.8,
			'position': 'absolute',
			'top': settings.position().top,
			'left': settings.position().left - 20,
			'width': '100%',
			'height': settings.height(),
			'padding-left': 20,
		});
		overlay.show();
	}
}

// Hide (with overlay) site options if overridden by a multisite option.
function hide_multisite_overridden_options() {
	var $ = jQuery;

	$( '.auth_multisite_override_overlay' ).each( function() {
		// Option to hide is stored in the overlay's id with 'overlay-hide-' prefix.
		var option_container_to_hide = $( this ).closest( 'tr' );
		if ( option_container_to_hide.length > 0 ) {
			$( this ).css({
				'background-color': '#f1f1f1',
				'z-index': 1,
				'opacity': 0.8,
				'position': 'absolute',
				'top': option_container_to_hide.position().top,
				'left': option_container_to_hide.position().left,
				'width': '100%',
				'height': option_container_to_hide.height(),
			});
			$( this ).show();
		}
	});
}



// Helper function to remove duplicate entries from an array of strings.
function remove_duplicates_from_array_of_strings( a ) {
	var seen = {};
	return a.filter( function ( item ) {
		return seen.hasOwnProperty( item ) ? false : ( seen[item] = true );
	});
}

// Helper function to hide/show wordpress option
function animate_option( action, option ) {
	var $ = jQuery;
	if ( action === 'show' ) {
		$( 'div.animated_wrapper', option ).slideDown( animation_speed );
		$( 'th', option ).animate({ padding: '20px 10px 20px 0' }, { duration: animation_speed });
		$( 'td', option ).animate({ padding: '15px 10px' }, { duration: animation_speed });
	} else if ( action === 'hide' ) {
		$( 'div.animated_wrapper', option ).slideUp( animation_speed );
		$( 'td, th', option ).animate({ padding: '0px' }, { duration: animation_speed });
	} else if ( action === 'hide_immediately' ) {
		$( 'div.animated_wrapper', option ).hide();
		$( 'td, th', option ).css({ padding: '0px' });
	}
}

// Helper function to grab a querystring param value by name
function getParameterByName( needle, haystack ) {
	needle = needle.replace( /[\[]/, "\\\[").replace(/[\]]/, "\\\]" );
	var regex = new RegExp( "[\\?&]" + needle + "=([^&#]*)" );
	var results = regex.exec( haystack );
	if( results === null )
		return '';
	else
		return decodeURIComponent( results[1].replace( /\+/g, " " ) );
}

// Helper function to generate a random string
function getRandomId() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for ( var i=0; i < 5; i++ )
		text += possible.charAt( Math.floor( Math.random() * possible.length ) );
	return text;
}

// Helper function to return a short date (e.g., Jul 2013) for today's date
function getShortDate( date ) {
	date = typeof date !== 'undefined' ? date : new Date();
	var month = '';
	switch ( date.getMonth() ) {
		case 0: month = 'Jan'; break;
		case 1: month = 'Feb'; break;
		case 2: month = 'Mar'; break;
		case 3: month = 'Apr'; break;
		case 4: month = 'May'; break;
		case 5: month = 'Jun'; break;
		case 6: month = 'Jul'; break;
		case 7: month = 'Aug'; break;
		case 8: month = 'Sep'; break;
		case 9: month = 'Oct'; break;
		case 10: month = 'Nov'; break;
		case 11: month = 'Dec'; break;
	}
	return month + ' ' + date.getFullYear();
}

// Helper function to grab a querystring value
function querystring( key ) {
	var re = new RegExp( '(?:\\?|&)'+key+'=(.*?)(?=&|$)', 'gi' );
	var r = [], m;
	while ( ( m = re.exec( document.location.search ) ) !== null )
		r.push( m[1] );
	return r;
}

// Helper function to check if an email address is valid.
function valid_email( email ) {
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return email.length > 0 && re.test( email );
}

// Helper function to set or update a querystring value.
function updateQueryStringParameter( uri, key, value ) {
	// Remove the hash before operating on the URI.
	var i = uri.indexOf( '#' );
	var hash = i === -1 ? ''  : uri.substr( i );
	uri = i === -1 ? uri : uri.substr( 0, i );

	var re = new RegExp( "([?&])" + key + "=.*?(&|$)", "i" );
	var separator = uri.indexOf( '?' ) !== -1 ? "&" : "?";

	if ( ! value ) {
		// Remove key-value pair if empty.
		uri = uri.replace( new RegExp( "([?&]?)" + key + "=[^&]*", "i" ), '' );
		if ( uri.slice( -1 ) === '?' ) {
			uri = uri.slice( 0, -1 );
		}
		// Replace first occurrence of & by ? if no ? is present.
		if ( uri.indexOf( '?' ) === -1 ) {
			uri = uri.replace( /&/, '?' );
		}
	} else if ( uri.match( re ) ) {
		uri = uri.replace( re, '$1' + key + "=" + value + '$2' );
	} else {
		uri = uri + separator + key + "=" + value;
	}
	return uri + hash;
}


jQuery( document ).ready( function( $ ) {
	// Grab references to form elements that we will show/hide on page load
	var auth_settings_access_role_receive_pending_emails = $( '#auth_settings_access_role_receive_pending_emails' ).closest( 'tr' );
	var auth_settings_access_pending_redirect_to_message = $( '#wp-auth_settings_access_pending_redirect_to_message-wrap' ).closest( 'tr' );
	var auth_settings_access_blocked_redirect_to_message = $( '#wp-auth_settings_access_blocked_redirect_to_message-wrap' ).closest( 'tr' );
	var auth_settings_access_should_email_approved_users = $( '#auth_settings_access_should_email_approved_users' ).closest( 'tr' );
	var auth_settings_access_email_approved_users_subject = $( '#auth_settings_access_email_approved_users_subject' ).closest( 'tr' );
	var auth_settings_access_email_approved_users_body = $( '#wp-auth_settings_access_email_approved_users_body-wrap' ).closest( 'tr' );
	var auth_settings_access_public_pages = $( '#auth_settings_access_public_pages' ).closest( 'tr' );
	var auth_settings_access_redirect_to_login = $( '#radio_auth_settings_access_redirect_to_login' ).closest( 'tr' );
	var auth_settings_access_public_warning = $( '#radio_auth_settings_access_public_warning' ).closest( 'tr' );
	var auth_settings_access_redirect_to_message = $( '#wp-auth_settings_access_redirect_to_message-wrap' ).closest( 'tr' );
	var auth_settings_external_settings_table = $( '#auth_settings_google' ).closest( 'table' );
	var auth_settings_external_google = $( '#auth_settings_google' ).closest( 'tr' );
	var auth_settings_external_google_clientid = $( '#auth_settings_google_clientid' ).closest( 'tr' );
	var auth_settings_external_google_clientsecret = $( '#auth_settings_google_clientsecret' ).closest( 'tr' );
	var auth_settings_external_google_hosteddomain = $( '#auth_settings_google_hosteddomain' ).closest( 'tr' );
	var auth_settings_external_cas = $( '#auth_settings_cas' ).closest( 'tr' );
	var auth_settings_external_cas_custom_label = $( '#auth_settings_cas_custom_label' ).closest( 'tr' );
	var auth_settings_external_cas_host = $( '#auth_settings_cas_host' ).closest( 'tr' );
	var auth_settings_external_cas_port = $( '#auth_settings_cas_port' ).closest( 'tr' );
	var auth_settings_external_cas_path = $( '#auth_settings_cas_path' ).closest( 'tr' );
	var auth_settings_external_cas_version = $( '#auth_settings_cas_version' ).closest( 'tr' );
	var auth_settings_external_cas_attr_email = $( '#auth_settings_cas_attr_email' ).closest( 'tr' );
	var auth_settings_external_cas_attr_first_name = $( '#auth_settings_cas_attr_first_name' ).closest( 'tr' );
	var auth_settings_external_cas_attr_last_name = $( '#auth_settings_cas_attr_last_name' ).closest( 'tr' );
	var auth_settings_external_cas_attr_update_on_login = $( '#auth_settings_cas_attr_update_on_login' ).closest( 'tr' );
	var auth_settings_external_cas_auto_login = $( '#auth_settings_cas_auto_login' ).closest( 'tr' );
	var auth_settings_external_ldap = $( '#auth_settings_ldap' ).closest( 'tr' );
	var auth_settings_external_ldap_host = $( '#auth_settings_ldap_host' ).closest( 'tr' );
	var auth_settings_external_ldap_port = $( '#auth_settings_ldap_port' ).closest( 'tr' );
	var auth_settings_external_ldap_search_base = $( '#auth_settings_ldap_search_base' ).closest( 'tr' );
	var auth_settings_external_ldap_uid = $( '#auth_settings_ldap_uid' ).closest( 'tr' );
	var auth_settings_external_ldap_attr_email = $( '#auth_settings_ldap_attr_email' ).closest( 'tr' );
	var auth_settings_external_ldap_user = $( '#auth_settings_ldap_user' ).closest( 'tr' );
	var auth_settings_external_ldap_password = $( '#auth_settings_ldap_password' ).closest( 'tr' );
	var auth_settings_external_ldap_tls = $( '#auth_settings_ldap_tls' ).closest( 'tr' );
	var auth_settings_external_ldap_lostpassword_url = $( '#auth_settings_ldap_lostpassword_url' ).closest( 'tr' );
	var auth_settings_external_ldap_attr_first_name = $( '#auth_settings_ldap_attr_first_name' ).closest( 'tr' );
	var auth_settings_external_ldap_attr_last_name = $( '#auth_settings_ldap_attr_last_name' ).closest( 'tr' );
	var auth_settings_external_ldap_attr_update_on_login = $( '#auth_settings_ldap_attr_update_on_login' ).closest( 'tr' );

	// Wrap the th and td in the rows above so we can animate their heights (can't animate tr heights with jquery)
	$( 'th, td', auth_settings_access_role_receive_pending_emails ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_pending_redirect_to_message ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_blocked_redirect_to_message ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_should_email_approved_users ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_email_approved_users_subject ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_email_approved_users_body ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_public_pages ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_redirect_to_login ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_public_warning ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_access_redirect_to_message ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_google_clientid ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_google_clientsecret ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_google_hosteddomain ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_custom_label ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_host ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_port ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_path ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_version ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_attr_email ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_attr_first_name ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_attr_last_name ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_attr_update_on_login ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_cas_auto_login ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_host ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_port ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_search_base ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_uid ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_attr_email ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_user ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_password ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_tls ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_lostpassword_url ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_attr_first_name ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_attr_last_name ).wrapInner( '<div class="animated_wrapper" />' );
	$( 'th, td', auth_settings_external_ldap_attr_update_on_login ).wrapInner( '<div class="animated_wrapper" />' );

	// If we're viewing the dashboard widget, reset a couple of the relevant
	// option variables (since they aren't nested in table rows).
	if ( $( '#auth_dashboard_widget' ).length ) {
		// Remove the helper link, since there are no tabs on the dashboard widget
		$( '#dashboard_link_approved_users' ).contents().unwrap();
	}

	// Hide settings unless "Only approved users" is checked
	if ( ! $( '#radio_auth_settings_access_who_can_login_approved_users' ).is( ':checked' ) ) {
		animate_option( 'hide_immediately', auth_settings_access_role_receive_pending_emails );
		animate_option( 'hide_immediately', auth_settings_access_pending_redirect_to_message );
		animate_option( 'hide_immediately', auth_settings_access_blocked_redirect_to_message );
		animate_option( 'hide_immediately', auth_settings_access_should_email_approved_users );
	}

	// Hide Welcome email body/subject options if "Send welcome email" is off.
	if ( ! $( '#auth_settings_access_should_email_approved_users' ).is( ':checked' ) ) {
		animate_option( 'hide_immediately', auth_settings_access_email_approved_users_subject );
		animate_option( 'hide_immediately', auth_settings_access_email_approved_users_body );
	}

	// On load: Show/hide public access options if everyone can see site
	if ( ! $( '#radio_auth_settings_access_who_can_view_logged_in_users' ).is( ':checked' ) ) {
		animate_option( 'hide_immediately', auth_settings_access_public_pages );
		animate_option( 'hide_immediately', auth_settings_access_redirect_to_login );
		animate_option( 'hide_immediately', auth_settings_access_public_warning );
		animate_option( 'hide_immediately', auth_settings_access_redirect_to_message );
	}

	// Hide Google options if unchecked
	if ( ! $( '#auth_settings_google' ).is( ':checked' ) ) {
		animate_option( 'hide_immediately', auth_settings_external_google_clientid );
		animate_option( 'hide_immediately', auth_settings_external_google_clientsecret );
		animate_option( 'hide_immediately', auth_settings_external_google_hosteddomain );
	}

	// Hide CAS options if unchecked
	if ( ! $( '#auth_settings_cas' ).is( ':checked' ) ) {
		animate_option( 'hide_immediately', auth_settings_external_cas_custom_label );
		animate_option( 'hide_immediately', auth_settings_external_cas_host );
		animate_option( 'hide_immediately', auth_settings_external_cas_port );
		animate_option( 'hide_immediately', auth_settings_external_cas_path );
		animate_option( 'hide_immediately', auth_settings_external_cas_version );
		animate_option( 'hide_immediately', auth_settings_external_cas_attr_email );
		animate_option( 'hide_immediately', auth_settings_external_cas_attr_first_name );
		animate_option( 'hide_immediately', auth_settings_external_cas_attr_last_name );
		animate_option( 'hide_immediately', auth_settings_external_cas_attr_update_on_login );
		animate_option( 'hide_immediately', auth_settings_external_cas_auto_login );
	}

	// Hide LDAP options if unchecked
	if ( ! $( '#auth_settings_ldap' ).is( ':checked' ) ) {
		animate_option( 'hide_immediately', auth_settings_external_ldap_host );
		animate_option( 'hide_immediately', auth_settings_external_ldap_port );
		animate_option( 'hide_immediately', auth_settings_external_ldap_search_base );
		animate_option( 'hide_immediately', auth_settings_external_ldap_uid );
		animate_option( 'hide_immediately', auth_settings_external_ldap_attr_email );
		animate_option( 'hide_immediately', auth_settings_external_ldap_user );
		animate_option( 'hide_immediately', auth_settings_external_ldap_password );
		animate_option( 'hide_immediately', auth_settings_external_ldap_tls );
		animate_option( 'hide_immediately', auth_settings_external_ldap_lostpassword_url );
		animate_option( 'hide_immediately', auth_settings_external_ldap_attr_first_name );
		animate_option( 'hide_immediately', auth_settings_external_ldap_attr_last_name );
		animate_option( 'hide_immediately', auth_settings_external_ldap_attr_update_on_login );
	}

	// Event handler: Hide "Handle unauthorized visitors" option if access is granted to "Everyone"
	$( 'input[name="auth_settings[access_who_can_login]"]' ).change( function() {
		// Hide settings unless "Only approved users" is checked
		var action = $( '#radio_auth_settings_access_who_can_login_approved_users' ).is( ':checked' ) ? 'show' : 'hide';
		animate_option( action, auth_settings_access_role_receive_pending_emails );
		animate_option( action, auth_settings_access_pending_redirect_to_message );
		animate_option( action, auth_settings_access_blocked_redirect_to_message );
		animate_option( action, auth_settings_access_should_email_approved_users );
		action = action === 'show' && $( '#auth_settings_access_should_email_approved_users' ).is( ':checked' ) ? 'show' : 'hide_immediately';
		animate_option( action, auth_settings_access_email_approved_users_subject );
		animate_option( action, auth_settings_access_email_approved_users_body );
	});

	// Event handler: Hide Welcome email body/subject options if "Send welcome email" is off.
	$( 'input[name="auth_settings[access_should_email_approved_users]"]' ).change( function() {
		var action = $( this ).is( ':checked' ) ? 'show' : 'hide';
		animate_option( action, auth_settings_access_email_approved_users_subject );
		animate_option( action, auth_settings_access_email_approved_users_body );
	});

	// Event handler: Hide "Handle unauthorized visitors" option if access is granted to "Everyone"
	$( 'input[name="auth_settings[access_who_can_view]"]' ).change( function() {
		var action = $( '#radio_auth_settings_access_who_can_view_everyone' ).is( ':checked' ) ? 'hide' : 'show';
		animate_option( action, auth_settings_access_redirect_to_login );
		animate_option( action, auth_settings_access_redirect_to_message );
		animate_option( action, auth_settings_access_public_pages );
		animate_option( action, auth_settings_access_public_warning );
	});

	// Event handler: Show/hide Google options based on checkbox
	$( 'input[name="auth_settings[google]"]' ).change( function() {
		var action = $( this ).is( ':checked' ) ? 'show' : 'hide';
		animate_option( action, auth_settings_external_google_clientid );
		animate_option( action, auth_settings_external_google_clientsecret );
		animate_option( action, auth_settings_external_google_hosteddomain );
	});

	// Event handler: Show/hide CAS options based on checkbox
	$( 'input[name="auth_settings[cas]"]' ).change( function() {
		var action = $( this ).is( ':checked' ) ? 'show' : 'hide';
		animate_option( action, auth_settings_external_cas_custom_label );
		animate_option( action, auth_settings_external_cas_host );
		animate_option( action, auth_settings_external_cas_port );
		animate_option( action, auth_settings_external_cas_path );
		animate_option( action, auth_settings_external_cas_version );
		animate_option( action, auth_settings_external_cas_attr_email );
		animate_option( action, auth_settings_external_cas_attr_first_name );
		animate_option( action, auth_settings_external_cas_attr_last_name );
		animate_option( action, auth_settings_external_cas_attr_update_on_login );
		animate_option( action, auth_settings_external_cas_auto_login );
	});

	// Event handler: Show/hide LDAP options based on checkbox
	$( 'input[name="auth_settings[ldap]"]' ).change( function() {
		var action = $( this ).is( ':checked' ) ? 'show' : 'hide';
		animate_option( action, auth_settings_external_ldap_host );
		animate_option( action, auth_settings_external_ldap_port );
		animate_option( action, auth_settings_external_ldap_search_base );
		animate_option( action, auth_settings_external_ldap_uid );
		animate_option( action, auth_settings_external_ldap_attr_email );
		animate_option( action, auth_settings_external_ldap_user );
		animate_option( action, auth_settings_external_ldap_password );
		animate_option( action, auth_settings_external_ldap_tls );
		animate_option( action, auth_settings_external_ldap_lostpassword_url );
		animate_option( action, auth_settings_external_ldap_attr_first_name );
		animate_option( action, auth_settings_external_ldap_attr_last_name );
		animate_option( action, auth_settings_external_ldap_attr_update_on_login );
	});

	// Show save button if usermeta field is modified.
	$( 'form input.auth-usermeta' ).on( 'keyup', function ( event ) {
		// Don't do anything if tab or arrow keys were pressed.
		if ( event.which === 9 || event.which === 37 || event.which === 38 || event.which === 39 || event.which === 40 ) {
			return;
		}
		$( this ).siblings( '.button' ).css( 'display', 'inline-block' );
	});

	// List management function: pressing enter in the new approved or new
	// blocked user (email or role field) adds the user to the list.
	$( '#new_approved_user_email, #new_approved_user_role, #new_blocked_user_email' ).on( 'keyup', function( e ) {
		// For textareas, make ctrl-enter add the user; for inputs, make enter add the user.
		if ( $( this ).is( 'textarea' ) ) {
			if ( e.which == 13 && ( e.ctrlKey || e.altKey ) ) { // Enter key (without Ctrl modifier)
				$( this ).parent().find( 'a' ).trigger( 'click' );
			}
		} else if ( e.which == 13 ) { // Enter key on input[type="text"]
			$( this ).parent().find( 'a' ).trigger( 'click' );
			e.preventDefault();
		}
	});

	// Don't submit form (i.e., save options) when hitting enter in any user list field.
	$( 'input.auth-email, select.auth-role, input.auth-date-added, input.auth-usermeta' ).on( 'keydown', function( e ) {
		if ( e.which == 13 ) { // Enter key
			e.preventDefault();
			return false;
		}
	});

	// Enable the user-friendly multiselect form element on the options page.
	$( '#auth_settings_access_public_pages' ).multiSelect({
		selectableOptgroup: true,
		selectableHeader: '<div class="custom-header">' + auth_L10n.private_pages + '</div>',
		selectionHeader: '<div class="custom-header">' + auth_L10n.public_pages + '</div>',
	});

	// Switch to the first tab (or the tab indicated in sessionStorage, or the querystring).
	var tab = '';
	if ( querystring( 'tab' ).length > 0 ) {
		tab = querystring( 'tab' )[0];
	} else if ( sessionStorage.getItem( 'tab' ) ) {
		tab = sessionStorage.getItem( 'tab' );
	}
	if ( $.inArray( tab, [ 'access_lists', 'access_login', 'access_public', 'external', 'advanced' ] ) < 0 ) {
		tab = 'access_lists';
	}
	choose_tab( tab, animation_speed );

	// Hide/show multisite settings based on override checkbox.
	$( 'input[name="auth_settings[multisite_override]"]' ).change( function() {
		hide_multisite_settings_if_disabled();
	});
	hide_multisite_settings_if_disabled();

	// Wire up pager events on Approved User list (first/last/next/previous
	// buttons, go to page text input, and search.
	$( '#current-page-selector, #user-search-input' ).on( 'keydown', function ( e ) {
		if ( e.which == 13 ) { // Enter key
			var searchTerm = $( '#user-search-input' ).val();
			var currentPage = parseInt( $( this ).val() ) || 1;
			var totalPages = parseInt( $( '.total-pages' ).first().text().replace( /[^0-9]/g, '' ) ) || 1;

			// Make sure current page is between 1 and max pages.
			if ( currentPage < 1 ) {
				currentPage = 1;
			} else if ( currentPage > totalPages ) {
				currentPage = totalPages;
			}

			// Update user list with users on next page.
			refresh_approved_user_list( currentPage, searchTerm );

			// Prevent default behavior.
			e.preventDefault();
			return false;
		}
	});
	$( '.tablenav' ).on( 'click', '.pagination-links a, #search-submit', function ( e ) {
		var searchTerm = $( '#user-search-input' ).val();
		var currentPage = parseInt( getParameterByName( 'paged', $( this ).attr( 'href' ) ) ) || 1;
		var totalPages = parseInt( $( '.total-pages' ).first().text().replace( /[^0-9]/g, '' ) ) || 1;
		if ( currentPage > totalPages ) {
			currentPage = totalPages;
		}

		// Update user list with users on next page.
		refresh_approved_user_list( currentPage, searchTerm );

		// Remove focus from clicked element.
		$( this ).blur();

		// Prevent default behavior.
		e.preventDefault();
		return false;
	});

	// Enable growable textarea for new user field.
	$( 'textarea#new_approved_user_email' ).autogrow();

	// Enable growable textarea for config fields.
	$( 'textarea#auth_settings_ldap_search_base' ).autogrow();
	$( 'textarea#auth_settings_google_hosteddomain' ).autogrow();

});


/**
 * Portions below from Bootstrap
 * http://getbootstrap.com/getting-started/#download
 */


/*!
 * Bootstrap v3.1.1 (http://getbootstrap.com)
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

if ( typeof jQuery === 'undefined' ) { throw new Error( 'Bootstrap\'s JavaScript requires jQuery' ) }

/* ========================================================================
 * Bootstrap: dropdown.js v3.1.1
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
	'use strict';

	// DROPDOWN CLASS DEFINITION
	// =========================

	var backdrop = '.dropdown-backdrop'
	var toggle   = '[data-toggle=dropdown]'
	var Dropdown = function ( element ) {
		$( element ).on( 'click.bs.dropdown', this.toggle)
	}

	Dropdown.prototype.toggle = function ( e ) {
		var $this = $( this )

		if ($this.is( '.disabled, :disabled' )) return

		var $parent  = getParent($this)
		var isActive = $parent.hasClass( 'open' )

		clearMenus()

		if (!isActive) {
			if ( 'ontouchstart' in document.documentElement && !$parent.closest( '.navbar-nav' ).length) {
				// if mobile we use a backdrop because click events don't delegate
				$( '<div class="dropdown-backdrop"/>' ).insertAfter($( this )).on( 'click', clearMenus)
			}

			var relatedTarget = { relatedTarget: this }
			$parent.trigger( e = $.Event( 'show.bs.dropdown', relatedTarget ) )

			if (e.isDefaultPrevented()) return

			$parent
				.toggleClass( 'open' )
				.trigger( 'shown.bs.dropdown', relatedTarget)

			$this.focus()
		}

		return false
	}

	Dropdown.prototype.keydown = function (e) {
		if (!/(38|40|27)/.test(e.keyCode)) return

		var $this = $( this )

		e.preventDefault()
		e.stopPropagation()

		if ($this.is( '.disabled, :disabled' )) return

		var $parent  = getParent($this)
		var isActive = $parent.hasClass( 'open' )

		if (!isActive || (isActive && e.keyCode == 27)) {
			if (e.which == 27) $parent.find(toggle).focus()
			return $this.click()
		}

		var desc = ' li:not(.divider):visible a'
		var $items = $parent.find( '[role=menu]' + desc + ', [role=listbox]' + desc)

		if (!$items.length) return

		var index = $items.index($items.filter( ':focus' ))

		if (e.keyCode == 38 && index > 0)                 index--                        // up
		if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
		if (!~index)                                      index = 0

		$items.eq(index).focus()
	}

	function clearMenus(e) {
		$(backdrop).remove()
		$(toggle).each(function () {
			var $parent = getParent($( this ))
			var relatedTarget = { relatedTarget: this }
			if (!$parent.hasClass( 'open' )) return
			$parent.trigger(e = $.Event( 'hide.bs.dropdown', relatedTarget))
			if (e.isDefaultPrevented()) return
			$parent.removeClass( 'open' ).trigger( 'hidden.bs.dropdown', relatedTarget)
		})
	}

	function getParent($this) {
		var selector = $this.attr( 'data-target' )

		if (!selector) {
			selector = $this.attr( 'href' )
			selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '' ) //strip for ie7
		}

		var $parent = selector && $(selector)

		return $parent && $parent.length ? $parent : $this.parent()
	}


	// DROPDOWN PLUGIN DEFINITION
	// ==========================

	var old = $.fn.dropdown

	$.fn.dropdown = function (option) {
		return this.each(function () {
			var $this = $( this )
			var data  = $this.data( 'bs.dropdown' )

			if (!data) $this.data( 'bs.dropdown', (data = new Dropdown( this )))
			if (typeof option == 'string' ) data[option].call($this)
		})
	}

	$.fn.dropdown.Constructor = Dropdown


	// DROPDOWN NO CONFLICT
	// ====================

	$.fn.dropdown.noConflict = function () {
		$.fn.dropdown = old
		return this
	}


	// APPLY TO STANDARD DROPDOWN ELEMENTS
	// ===================================

	$(document)
		.on( 'click.bs.dropdown.data-api', clearMenus)
		.on( 'click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
		.on( 'click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
		.on( 'keydown.bs.dropdown.data-api', toggle + ', [role=menu], [role=listbox]', Dropdown.prototype.keydown)

}(jQuery);
