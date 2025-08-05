# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{pkgs}: {
  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = with pkgs; [
    pkgs.nodejs
    pkgs.zulu
    (pkgs.python311.withPackages (ps: with ps; [
      djangorestframework
      django-cors-headers  # For CORS
      twilio               # For WhatsApp communication
      cryptography         # For digital signing features
      django-filter        # For filtering querysets
      pillow               # For image processing
      pip
    ]))
  ];
  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Extensions from Open VSX
    extensions = [
      "vscodevim.vim"
    ];

    # Workspace settings
    workspace = {
      onCreate = {
        default.openFiles = [
          "src/app/page.tsx"
        ];
      };
    };

    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0" ];
          manager = "web";
        };
      };
    };
  };
}
