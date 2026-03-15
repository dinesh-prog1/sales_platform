package helper

import "os"

// readFile reads a file and returns its contents as a byte slice.
func readFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}
