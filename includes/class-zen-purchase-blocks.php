<?php
/**
 * Main plugin class.
 *
 * @package ZenPurchaseBlocks
 */

defined( 'ABSPATH' ) || exit;

final class ZPB_Zen_Purchase_Blocks {

	const REST_NAMESPACE = 'zen-purchase-blocks/v1';

	/**
	 * Boot hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_blocks' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );

		if ( is_admin() ) {
			add_action( 'admin_notices', array( __CLASS__, 'maybe_dependency_notice' ) );
		}
	}

	/**
	 * Register dynamic blocks.
	 */
	public static function register_blocks() {
		register_block_type(
			ZPB_PLUGIN_DIR . 'build/membership-plans',
			array(
				'render_callback' => array( __CLASS__, 'render_membership_plans_block' ),
			)
		);
	}

	/**
	 * Register editor REST routes.
	 */
	public static function register_rest_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/membership-plans',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'rest_get_membership_plans' ),
				'permission_callback' => array( __CLASS__, 'can_edit_blocks' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/membership-plans/(?P<id>\d+)/products',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'rest_get_membership_plan_products' ),
				'permission_callback' => array( __CLASS__, 'can_edit_blocks' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'required'          => true,
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/membership-plan-products',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'rest_get_membership_plans_products' ),
				'permission_callback' => array( __CLASS__, 'can_edit_blocks' ),
				'args'                => array(
					'ids' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'required'          => false,
					),
				),
			)
		);
	}

	/**
	 * Editor route permission.
	 *
	 * @return bool
	 */
	public static function can_edit_blocks() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Dependency notice.
	 */
	public static function maybe_dependency_notice() {
		if ( self::dependencies_loaded() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		echo '<div class="notice notice-warning"><p>';
		echo esc_html__( 'Zen Purchase Blocks needs WooCommerce and WooCommerce Memberships for the Membership Plans block.', 'zen-purchase-blocks' );
		echo '</p></div>';
	}

	/**
	 * Check required runtime dependencies.
	 *
	 * @return bool
	 */
	private static function dependencies_loaded() {
		return function_exists( 'WC' )
			&& function_exists( 'wc_get_product' )
			&& function_exists( 'wc_memberships_get_membership_plans' )
			&& function_exists( 'wc_memberships_get_membership_plan' );
	}

	/**
	 * REST: get membership plans.
	 *
	 * @return WP_REST_Response
	 */
	public static function rest_get_membership_plans() {
		if ( ! self::dependencies_loaded() ) {
			return rest_ensure_response( array() );
		}

		$plans = array();

		foreach ( wc_memberships_get_membership_plans( array( 'post_status' => 'any' ) ) as $plan ) {
			$plans[] = array(
				'id'   => (int) $plan->get_id(),
				'name' => html_entity_decode( wp_strip_all_tags( $plan->get_name() ), ENT_QUOTES, get_bloginfo( 'charset' ) ),
			);
		}

		return rest_ensure_response( $plans );
	}

	/**
	 * REST: get purchasable products/variations assigned to a membership plan.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function rest_get_membership_plan_products( WP_REST_Request $request ) {
		$plan_id = absint( $request['id'] );

		return rest_ensure_response( self::get_membership_plan_product_options( $plan_id ) );
	}

	/**
	 * REST: get purchasable products/variations assigned to multiple membership plans.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function rest_get_membership_plans_products( WP_REST_Request $request ) {
		$plan_ids = self::normalize_plan_ids( array( 'membershipPlanIds' => explode( ',', (string) $request->get_param( 'ids' ) ) ) );

		return rest_ensure_response( self::get_membership_plans_product_options( $plan_ids ) );
	}

	/**
	 * Normalize plan IDs from block attributes or REST values.
	 *
	 * @param array $attributes Block attributes or plan values.
	 * @return int[]
	 */
	private static function normalize_plan_ids( array $attributes ) {
		$plan_ids = array();

		if ( ! empty( $attributes['membershipPlanIds'] ) && is_array( $attributes['membershipPlanIds'] ) ) {
			$plan_ids = array_map( 'absint', $attributes['membershipPlanIds'] );
		} elseif ( ! empty( $attributes['membershipPlanId'] ) ) {
			$plan_ids = array( absint( $attributes['membershipPlanId'] ) );
		}

		return array_values( array_unique( array_filter( $plan_ids ) ) );
	}

	/**
	 * Build selectable product options for several plans.
	 *
	 * @param int[] $plan_ids Plan IDs.
	 * @return array
	 */
	private static function get_membership_plans_product_options( array $plan_ids ) {
		$options = array();

		foreach ( $plan_ids as $plan_id ) {
			foreach ( self::get_membership_plan_product_options( $plan_id ) as $option ) {
				if ( empty( $options[ $option['key'] ] ) ) {
					$options[ $option['key'] ] = $option;
					$options[ $option['key'] ]['membershipPlanIds'] = array( $plan_id );
				} else {
					$options[ $option['key'] ]['membershipPlanIds'][] = $plan_id;
					$options[ $option['key'] ]['membershipPlanIds'] = array_values( array_unique( $options[ $option['key'] ]['membershipPlanIds'] ) );
				}
			}
		}

		return array_values( $options );
	}

	/**
	 * Build selectable product options for a plan.
	 *
	 * @param int $plan_id Plan ID.
	 * @return array
	 */
	private static function get_membership_plan_product_options( $plan_id ) {
		if ( ! self::dependencies_loaded() ) {
			return array();
		}

		$plan = wc_memberships_get_membership_plan( $plan_id );

		if ( ! $plan || ! method_exists( $plan, 'get_product_ids' ) ) {
			return array();
		}

		$options = array();

		foreach ( $plan->get_product_ids() as $product_id ) {
			$product = wc_get_product( $product_id );

			if ( ! $product ) {
				continue;
			}

			if ( $product->is_type( array( 'variable', 'variable-subscription' ) ) ) {
				foreach ( $product->get_children() as $variation_id ) {
					$variation = wc_get_product( $variation_id );

					if ( $variation ) {
						$options[] = self::format_product_option( $variation, $product );
					}
				}
				continue;
			}

			$options[] = self::format_product_option( $product );
		}

		return array_values(
			array_filter(
				$options,
				static function ( $option ) {
					return ! empty( $option['productId'] );
				}
			)
		);
	}

	/**
	 * Format a product or variation for editor and renderer use.
	 *
	 * @param WC_Product      $product Product.
	 * @param WC_Product|null $parent  Optional parent product.
	 * @return array
	 */
	private static function format_product_option( WC_Product $product, $parent = null ) {
		$product_id   = (int) $product->get_id();
		$parent_id    = $parent ? (int) $parent->get_id() : 0;
		$cart_product = $parent_id ? $parent : $product;
		$name         = $parent ? $parent->get_name() . ' - ' . wc_get_formatted_variation( $product, true, false, true ) : $product->get_name();
		$coins        = self::get_product_zencoin_grant( $product_id, $parent_id );

		return array(
			'key'              => self::make_item_key( $parent_id ? $parent_id : $product_id, $parent_id ? $product_id : 0 ),
			'productId'        => $parent_id ? $parent_id : $product_id,
			'variationId'      => $parent_id ? $product_id : 0,
			'name'             => html_entity_decode( wp_strip_all_tags( $name ), ENT_QUOTES, get_bloginfo( 'charset' ) ),
			'priceHtml'        => wp_kses_post( $product->get_price_html() ),
			'priceText'        => html_entity_decode( wp_strip_all_tags( $product->get_price_html() ), ENT_QUOTES, get_bloginfo( 'charset' ) ),
			'billingPeriod'    => self::get_subscription_period_label( $product ),
			'zencoins'         => $coins,
			'zencoinValueText' => $coins > 0 ? wc_format_decimal( $coins, 0 ) : '',
			'perZencoinText'   => self::get_price_per_zencoin_text( $product, $coins ),
			'purchasable'      => $product->is_purchasable() && $product->is_in_stock() && $cart_product->is_purchasable(),
			'addToCartUrl'     => self::get_product_add_to_cart_url( $product, $parent ),
			'permalink'        => $product->get_permalink(),
		);
	}

	/**
	 * Build a stable selected item key.
	 *
	 * @param int $product_id Product ID.
	 * @param int $variation_id Variation ID.
	 * @return string
	 */
	private static function make_item_key( $product_id, $variation_id = 0 ) {
		return absint( $product_id ) . ':' . absint( $variation_id );
	}

	/**
	 * Get Zencoin grant amount from CBB meta.
	 *
	 * @param int $product_id Product or variation ID.
	 * @param int $parent_id  Parent product ID.
	 * @return float
	 */
	private static function get_product_zencoin_grant( $product_id, $parent_id = 0 ) {
		$meta_keys = array( '_cbb_zencoin_grant_amount', '_cbb_coin_grant_amount' );

		foreach ( $meta_keys as $meta_key ) {
			$value = get_post_meta( $product_id, $meta_key, true );

			if ( '' !== $value && is_numeric( $value ) ) {
				return (float) $value;
			}
		}

		if ( $parent_id ) {
			foreach ( $meta_keys as $meta_key ) {
				$value = get_post_meta( $parent_id, $meta_key, true );

				if ( '' !== $value && is_numeric( $value ) ) {
					return (float) $value;
				}
			}
		}

		return 0.0;
	}

	/**
	 * Get human billing label for subscription products.
	 *
	 * @param WC_Product $product Product.
	 * @return string
	 */
	private static function get_subscription_period_label( WC_Product $product ) {
		if ( ! class_exists( 'WC_Subscriptions_Product' ) || ! WC_Subscriptions_Product::is_subscription( $product ) ) {
			return '';
		}

		$period   = WC_Subscriptions_Product::get_period( $product );
		$interval = (int) WC_Subscriptions_Product::get_interval( $product );
		$periods  = function_exists( 'wcs_get_subscription_period_strings' ) ? wcs_get_subscription_period_strings() : array();
		$label    = isset( $periods[ $period ] ) ? $periods[ $period ] : $period;

		if ( $interval > 1 ) {
			return sprintf( '/%1$d %2$s', $interval, $label );
		}

		return $label ? '/' . $label : '';
	}

	/**
	 * Calculate price per Zencoin display text.
	 *
	 * @param WC_Product $product Product.
	 * @param float      $coins   Zencoin grant.
	 * @return string
	 */
	private static function get_price_per_zencoin_text( WC_Product $product, $coins ) {
		$price = (float) wc_get_price_to_display( $product );

		if ( $price <= 0 || $coins <= 0 ) {
			return '';
		}

		return sprintf(
			/* translators: %s: price per Zencoin */
			__( '~ %s / Zencoin', 'zen-purchase-blocks' ),
			wp_strip_all_tags( wc_price( $price / $coins ) )
		);
	}

	/**
	 * Build add-to-cart URL, including variation attributes when needed.
	 *
	 * @param WC_Product      $product Product or variation.
	 * @param WC_Product|null $parent  Parent variable product.
	 * @return string
	 */
	private static function get_product_add_to_cart_url( WC_Product $product, $parent = null ) {
		if ( $parent && $product->is_type( 'variation' ) ) {
			$args = array(
				'add-to-cart' => (int) $parent->get_id(),
				'variation_id' => (int) $product->get_id(),
			);

			foreach ( $product->get_variation_attributes() as $attribute_name => $attribute_value ) {
				if ( '' !== $attribute_value ) {
					$args[ $attribute_name ] = $attribute_value;
				}
			}

			return add_query_arg( $args, get_permalink( $parent->get_id() ) );
		}

		return $product->add_to_cart_url();
	}

	/**
	 * Render the Membership Plans block.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public static function render_membership_plans_block( $attributes ) {
		if ( ! self::dependencies_loaded() ) {
			return '<div class="zpb-membership-plans zpb-membership-plans--notice">' . esc_html__( 'WooCommerce Memberships is required to show membership plans.', 'zen-purchase-blocks' ) . '</div>';
		}

		$plan_ids = self::normalize_plan_ids( $attributes );

		if ( empty( $plan_ids ) ) {
			return '';
		}

		$selected_items = self::normalize_selected_items( isset( $attributes['selectedItems'] ) ? $attributes['selectedItems'] : array() );
		$product_map    = array();

		foreach ( self::get_membership_plans_product_options( $plan_ids ) as $option ) {
			$product_map[ $option['key'] ] = $option;
		}

		$groups = array(
			'monthly' => array(),
			'yearly'  => array(),
		);

		foreach ( $selected_items as $item ) {
			if ( empty( $product_map[ $item['key'] ] ) ) {
				continue;
			}

			$group = 'yearly' === $item['billingGroup'] ? 'yearly' : 'monthly';
			$groups[ $group ][] = array_merge( $product_map[ $item['key'] ], $item );
		}

		$groups = array_filter( $groups );

		if ( empty( $groups ) ) {
			return '';
		}

		wp_enqueue_style( 'zen-purchase-blocks-membership-plans-style' );
		wp_enqueue_script( 'zen-purchase-blocks-membership-plans-view-script' );

		$labels       = wp_parse_args(
			isset( $attributes['labels'] ) && is_array( $attributes['labels'] ) ? $attributes['labels'] : array(),
			self::get_default_labels()
		);
		$active_group = isset( $groups['monthly'] ) ? 'monthly' : array_key_first( $groups );
		$wrapper_attr = get_block_wrapper_attributes(
			array(
				'class' => 'zpb-membership-plans',
			)
		);

		ob_start();
		?>
		<section <?php echo $wrapper_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php if ( ! empty( $attributes['heading'] ) ) : ?>
				<h2 class="zpb-membership-plans__heading"><?php echo esc_html( $attributes['heading'] ); ?></h2>
			<?php endif; ?>

			<?php if ( ! empty( $attributes['intro'] ) ) : ?>
				<p class="zpb-membership-plans__intro"><?php echo wp_kses_post( $attributes['intro'] ); ?></p>
			<?php endif; ?>

			<?php if ( count( $groups ) > 1 ) : ?>
				<div class="zpb-membership-plans__tabs" role="tablist">
					<?php foreach ( $groups as $group_key => $items ) : ?>
						<button
							type="button"
							class="zpb-membership-plans__tab <?php echo $group_key === $active_group ? 'is-active' : ''; ?>"
							data-zpb-tab="<?php echo esc_attr( $group_key ); ?>"
							role="tab"
							aria-selected="<?php echo $group_key === $active_group ? 'true' : 'false'; ?>"
						>
							<?php echo esc_html( isset( $labels[ $group_key ] ) ? $labels[ $group_key ] : ucfirst( $group_key ) ); ?>
						</button>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>

			<div class="zpb-membership-plans__panels">
				<?php foreach ( $groups as $group_key => $items ) : ?>
					<div class="zpb-membership-plans__panel <?php echo $group_key === $active_group ? 'is-active' : ''; ?>" data-zpb-panel="<?php echo esc_attr( $group_key ); ?>">
						<div class="zpb-membership-plans__grid">
							<?php foreach ( $items as $item ) : ?>
								<?php echo self::render_membership_card( $item, $labels ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php endforeach; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</section>
		<?php
		return ob_get_clean();
	}

	/**
	 * Render one membership card.
	 *
	 * @param array $item   Item data.
	 * @param array $labels Labels.
	 * @return string
	 */
	private static function render_membership_card( array $item, array $labels ) {
		$title       = ! empty( $item['titleOverride'] ) ? $item['titleOverride'] : $item['name'];
		$subtitle    = ! empty( $item['subtitleOverride'] ) ? $item['subtitleOverride'] : '';
		$benefits    = isset( $item['benefits'] ) && is_array( $item['benefits'] ) ? $item['benefits'] : array();
		$card_classes = 'zpb-membership-card';

		if ( ! empty( $item['featured'] ) ) {
			$card_classes .= ' is-featured';
		}

		ob_start();
		?>
		<article class="<?php echo esc_attr( $card_classes ); ?>">
			<?php if ( ! empty( $item['badgeText'] ) ) : ?>
				<div class="zpb-membership-card__badge"><?php echo esc_html( $item['badgeText'] ); ?></div>
			<?php endif; ?>

			<header class="zpb-membership-card__header">
				<div class="zpb-membership-card__brand">zenctuary</div>
				<h3 class="zpb-membership-card__title"><?php echo esc_html( $title ); ?></h3>
				<?php if ( $subtitle ) : ?>
					<p class="zpb-membership-card__subtitle"><?php echo esc_html( $subtitle ); ?></p>
				<?php endif; ?>
			</header>

			<div class="zpb-membership-card__body">
				<div class="zpb-membership-card__price">
					<span class="zpb-membership-card__amount"><?php echo wp_kses_post( $item['priceHtml'] ); ?></span>
					<?php if ( ! empty( $item['billingPeriod'] ) ) : ?>
						<span class="zpb-membership-card__period"><?php echo esc_html( $item['billingPeriod'] ); ?></span>
					<?php endif; ?>
				</div>

				<?php if ( ! empty( $item['zencoinValueText'] ) ) : ?>
					<div class="zpb-membership-card__coins">
						<span class="zpb-membership-card__coins-label"><?php echo esc_html( $labels['zencoins'] ); ?></span>
						<span class="zpb-membership-card__coin"><?php echo esc_html( $item['zencoinValueText'] ); ?></span>
						<?php if ( ! empty( $item['perZencoinText'] ) ) : ?>
							<span class="zpb-membership-card__coin-rate"><?php echo esc_html( $item['perZencoinText'] ); ?></span>
						<?php endif; ?>
					</div>
				<?php endif; ?>

				<?php if ( $benefits ) : ?>
					<ul class="zpb-membership-card__benefits">
						<?php foreach ( $benefits as $benefit ) : ?>
							<?php if ( '' !== trim( (string) $benefit ) ) : ?>
								<li><?php echo esc_html( $benefit ); ?></li>
							<?php endif; ?>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>

				<a class="zpb-membership-card__button" href="<?php echo esc_url( ! empty( $item['purchasable'] ) ? $item['addToCartUrl'] : $item['permalink'] ); ?>">
					<?php echo esc_html( $labels['button'] ); ?>
				</a>

				<?php if ( ! empty( $item['moreInfo'] ) ) : ?>
					<details class="zpb-membership-card__more">
						<summary><?php echo esc_html( $labels['moreInfo'] ); ?></summary>
						<div><?php echo wp_kses_post( wpautop( $item['moreInfo'] ) ); ?></div>
					</details>
				<?php endif; ?>
			</div>
		</article>
		<?php
		return ob_get_clean();
	}

	/**
	 * Normalize selected items from block attributes.
	 *
	 * @param mixed $items Raw items.
	 * @return array
	 */
	private static function normalize_selected_items( $items ) {
		if ( ! is_array( $items ) ) {
			return array();
		}

		$normalized = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$product_id   = isset( $item['productId'] ) ? absint( $item['productId'] ) : 0;
			$variation_id = isset( $item['variationId'] ) ? absint( $item['variationId'] ) : 0;

			if ( ! $product_id ) {
				continue;
			}

			$benefits = isset( $item['benefits'] ) && is_array( $item['benefits'] ) ? array_map( 'sanitize_text_field', $item['benefits'] ) : array();

			$normalized[] = array(
				'key'              => self::make_item_key( $product_id, $variation_id ),
				'productId'        => $product_id,
				'variationId'      => $variation_id,
				'billingGroup'     => isset( $item['billingGroup'] ) && 'yearly' === $item['billingGroup'] ? 'yearly' : 'monthly',
				'featured'         => ! empty( $item['featured'] ),
				'badgeText'        => isset( $item['badgeText'] ) ? sanitize_text_field( $item['badgeText'] ) : '',
				'titleOverride'    => isset( $item['titleOverride'] ) ? sanitize_text_field( $item['titleOverride'] ) : '',
				'subtitleOverride' => isset( $item['subtitleOverride'] ) ? sanitize_text_field( $item['subtitleOverride'] ) : '',
				'benefits'         => $benefits,
				'moreInfo'         => isset( $item['moreInfo'] ) ? wp_kses_post( $item['moreInfo'] ) : '',
			);
		}

		return $normalized;
	}

	/**
	 * Default copy labels.
	 *
	 * @return array
	 */
	private static function get_default_labels() {
		return array(
			'monthly'  => __( 'Monthly', 'zen-purchase-blocks' ),
			'yearly'   => __( 'Yearly', 'zen-purchase-blocks' ),
			'button'   => __( 'Become Member', 'zen-purchase-blocks' ),
			'zencoins' => __( 'ZENCOINS:', 'zen-purchase-blocks' ),
			'moreInfo' => __( 'more information', 'zen-purchase-blocks' ),
		);
	}
}
