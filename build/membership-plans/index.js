( function ( blocks, blockEditor, components, element, i18n, apiFetch, serverSideRender ) {
	var el = element.createElement;
	var __ = i18n.__;
	var registerBlockType = blocks.registerBlockType;
	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;
	var TextControl = components.TextControl;
	var TextareaControl = components.TextareaControl;
	var ToggleControl = components.ToggleControl;
	var Button = components.Button;
	var Spinner = components.Spinner;
	var Notice = components.Notice;
	var ServerSideRender = serverSideRender;

	function itemKey( productId, variationId ) {
		return parseInt( productId || 0, 10 ) + ':' + parseInt( variationId || 0, 10 );
	}

	function normalizeLabels( labels ) {
		return Object.assign(
			{
				monthly: 'Monthly',
				yearly: 'Yearly',
				button: 'Become Member',
				zencoins: 'ZENCOINS:',
				moreInfo: 'more information'
			},
			labels || {}
		);
	}

	function splitBenefits( value ) {
		return String( value || '' )
			.split( '\n' )
			.map( function ( line ) {
				return line.trim();
			} )
			.filter( Boolean );
	}

	function Edit( props ) {
		var attributes = props.attributes;
		var setAttributes = props.setAttributes;
		var blockProps = useBlockProps( { className: 'zpb-membership-plans-editor' } );
		var useState = element.useState;
		var useEffect = element.useEffect;
		var plansState = useState( [] );
		var plans = plansState[ 0 ];
		var setPlans = plansState[ 1 ];
		var productsState = useState( [] );
		var products = productsState[ 0 ];
		var setProducts = productsState[ 1 ];
		var loadingState = useState( false );
		var loading = loadingState[ 0 ];
		var setLoading = loadingState[ 1 ];
		var errorState = useState( '' );
		var error = errorState[ 0 ];
		var setError = errorState[ 1 ];
		var labels = normalizeLabels( attributes.labels );
		var selectedItems = Array.isArray( attributes.selectedItems ) ? attributes.selectedItems : [];
		var selectedByKey = {};

		selectedItems.forEach( function ( item ) {
			selectedByKey[ itemKey( item.productId, item.variationId ) ] = item;
		} );

		useEffect( function () {
			apiFetch( { path: '/zen-purchase-blocks/v1/membership-plans' } )
				.then( function ( response ) {
					setPlans( response || [] );
				} )
				.catch( function () {
					setError( __( 'Could not load membership plans.', 'zen-purchase-blocks' ) );
				} );
		}, [] );

		useEffect( function () {
			if ( ! attributes.membershipPlanId ) {
				setProducts( [] );
				return;
			}

			setLoading( true );
			setError( '' );

			apiFetch( { path: '/zen-purchase-blocks/v1/membership-plans/' + attributes.membershipPlanId + '/products' } )
				.then( function ( response ) {
					setProducts( response || [] );
					setLoading( false );
				} )
				.catch( function () {
					setError( __( 'Could not load products for this membership plan.', 'zen-purchase-blocks' ) );
					setLoading( false );
				} );
		}, [ attributes.membershipPlanId ] );

		function updateLabels( key, value ) {
			var next = Object.assign( {}, labels );
			next[ key ] = value;
			setAttributes( { labels: next } );
		}

		function updateItem( key, patch ) {
			var next = selectedItems.map( function ( item ) {
				if ( itemKey( item.productId, item.variationId ) !== key ) {
					return item;
				}

				return Object.assign( {}, item, patch );
			} );

			setAttributes( { selectedItems: next } );
		}

		function toggleProduct( product, checked ) {
			var key = itemKey( product.productId, product.variationId );
			var next;

			if ( checked ) {
				if ( selectedByKey[ key ] ) {
					return;
				}

				next = selectedItems.concat( [
					{
						productId: product.productId,
						variationId: product.variationId || 0,
						billingGroup: 'monthly',
						featured: false,
						badgeText: '',
						titleOverride: '',
						subtitleOverride: '',
						benefits: [],
						moreInfo: ''
					}
				] );
			} else {
				next = selectedItems.filter( function ( item ) {
					return itemKey( item.productId, item.variationId ) !== key;
				} );
			}

			setAttributes( { selectedItems: next } );
		}

		var planOptions = [ { label: __( 'Select a membership plan', 'zen-purchase-blocks' ), value: 0 } ].concat(
			plans.map( function ( plan ) {
				return { label: plan.name, value: plan.id };
			} )
		);

		return el(
			'div',
			blockProps,
			el(
				InspectorControls,
				null,
				el(
					PanelBody,
					{ title: __( 'Membership Source', 'zen-purchase-blocks' ), initialOpen: true },
					el( SelectControl, {
						label: __( 'Membership plan', 'zen-purchase-blocks' ),
						value: attributes.membershipPlanId || 0,
						options: planOptions,
						onChange: function ( value ) {
							setAttributes( { membershipPlanId: parseInt( value || 0, 10 ), selectedItems: [] } );
						}
					} ),
					loading ? el( Spinner ) : null,
					error ? el( Notice, { status: 'error', isDismissible: false }, error ) : null
				),
				el(
					PanelBody,
					{ title: __( 'Section Copy', 'zen-purchase-blocks' ), initialOpen: false },
					el( TextControl, {
						label: __( 'Heading', 'zen-purchase-blocks' ),
						value: attributes.heading || '',
						onChange: function ( value ) {
							setAttributes( { heading: value } );
						}
					} ),
					el( TextareaControl, {
						label: __( 'Intro', 'zen-purchase-blocks' ),
						value: attributes.intro || '',
						onChange: function ( value ) {
							setAttributes( { intro: value } );
						}
					} ),
					el( TextControl, {
						label: __( 'Monthly tab label', 'zen-purchase-blocks' ),
						value: labels.monthly,
						onChange: function ( value ) {
							updateLabels( 'monthly', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Yearly tab label', 'zen-purchase-blocks' ),
						value: labels.yearly,
						onChange: function ( value ) {
							updateLabels( 'yearly', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Button label', 'zen-purchase-blocks' ),
						value: labels.button,
						onChange: function ( value ) {
							updateLabels( 'button', value );
						}
					} )
				),
				el(
					PanelBody,
					{ title: __( 'Products To Show', 'zen-purchase-blocks' ), initialOpen: true },
					! attributes.membershipPlanId
						? el( 'p', null, __( 'Choose a membership plan first.', 'zen-purchase-blocks' ) )
						: null,
					attributes.membershipPlanId && ! loading && products.length === 0
						? el( 'p', null, __( 'No assigned products or variations were found for this plan.', 'zen-purchase-blocks' ) )
						: null,
					products.map( function ( product ) {
						var key = itemKey( product.productId, product.variationId );
						var item = selectedByKey[ key ];

						return el(
							'div',
							{ className: 'zpb-editor-product', key: key },
							el( ToggleControl, {
								label: product.name,
								help: product.priceText + ( product.zencoinValueText ? ' | ' + product.zencoinValueText + ' ZC' : '' ),
								checked: !! item,
								onChange: function ( checked ) {
									toggleProduct( product, checked );
								}
							} ),
							item
								? el(
									'div',
									{ className: 'zpb-editor-product__settings' },
									el( SelectControl, {
										label: __( 'Billing tab', 'zen-purchase-blocks' ),
										value: item.billingGroup || 'monthly',
										options: [
											{ label: labels.monthly, value: 'monthly' },
											{ label: labels.yearly, value: 'yearly' }
										],
										onChange: function ( value ) {
											updateItem( key, { billingGroup: value } );
										}
									} ),
									el( ToggleControl, {
										label: __( 'Featured gold card', 'zen-purchase-blocks' ),
										checked: !! item.featured,
										onChange: function ( checked ) {
											updateItem( key, { featured: checked } );
										}
									} ),
									el( TextControl, {
										label: __( 'Savings badge', 'zen-purchase-blocks' ),
										value: item.badgeText || '',
										placeholder: __( 'Save 108 EUR per year', 'zen-purchase-blocks' ),
										onChange: function ( value ) {
											updateItem( key, { badgeText: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Title override', 'zen-purchase-blocks' ),
										value: item.titleOverride || '',
										placeholder: product.name,
										onChange: function ( value ) {
											updateItem( key, { titleOverride: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Subtitle override', 'zen-purchase-blocks' ),
										value: item.subtitleOverride || '',
										placeholder: __( 'MASTER', 'zen-purchase-blocks' ),
										onChange: function ( value ) {
											updateItem( key, { subtitleOverride: value } );
										}
									} ),
									el( TextareaControl, {
										label: __( 'Benefits, one per line', 'zen-purchase-blocks' ),
										value: Array.isArray( item.benefits ) ? item.benefits.join( '\n' ) : '',
										onChange: function ( value ) {
											updateItem( key, { benefits: splitBenefits( value ) } );
										}
									} ),
									el( TextareaControl, {
										label: __( 'More information', 'zen-purchase-blocks' ),
										value: item.moreInfo || '',
										onChange: function ( value ) {
											updateItem( key, { moreInfo: value } );
										}
									} )
								)
								: null
						);
					} )
				)
			),
			el(
				'div',
				{ className: 'zpb-editor-preview' },
				el( ServerSideRender, {
					block: 'zen-purchase-blocks/membership-plans',
					attributes: attributes
				} )
			)
		);
	}

	registerBlockType( 'zen-purchase-blocks/membership-plans', {
		edit: Edit,
		save: function () {
			return null;
		}
	} );
} )(
	window.wp.blocks,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.element,
	window.wp.i18n,
	window.wp.apiFetch,
	window.wp.serverSideRender
);
