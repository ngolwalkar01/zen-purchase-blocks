<?php
/**
 * Plugin Name: Zen Purchase Blocks
 * Description: Dynamic purchase blocks for memberships, packages, drop-ins, and future gift-card offers.
 * Version: 0.3.8
 * Author: Custom
 * Text Domain: zen-purchase-blocks
 *
 * @package ZenPurchaseBlocks
 */

defined( 'ABSPATH' ) || exit;

define( 'ZPB_VERSION', '0.3.8' );
define( 'ZPB_PLUGIN_FILE', __FILE__ );
define( 'ZPB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ZPB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

$zpb_main_class_file = ZPB_PLUGIN_DIR . 'includes/class-zen-purchase-blocks.php';

if ( ! file_exists( $zpb_main_class_file ) ) {
	add_action(
		'admin_notices',
		static function () use ( $zpb_main_class_file ) {
			printf(
				'<div class="notice notice-error"><p>%s</p></div>',
				esc_html(
					sprintf(
						/* translators: %s: missing plugin file path. */
						__( 'Zen Purchase Blocks is missing a required file: %s. Please upload the complete plugin folder.', 'zen-purchase-blocks' ),
						$zpb_main_class_file
					)
				)
			);
		}
	);

	return;
}

require_once $zpb_main_class_file;

ZPB_Zen_Purchase_Blocks::init();
