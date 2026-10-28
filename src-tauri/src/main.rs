// Prevents console/command prompt window on Windows in all build configurations
#![windows_subsystem = "windows"]

fn main() {
    inkova_lib::run()
}
