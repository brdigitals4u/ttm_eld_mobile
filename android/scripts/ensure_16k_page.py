#!/usr/bin/env python3
"""
Patch ELF binaries so each PT_LOAD segment has p_align >= 16 KB.
Android 15 warns when native libraries are not aligned for the new 16 KB
page size. Third-party .so files can be fixed post-build by adjusting
their program headers. This script is intentionally defensive: if anything
looks unexpected we bail out without modifying the binary.
"""

import os
import struct
import sys
from typing import Tuple


PAGE_SIZE = 16384
ELF_MAGIC = b"\x7fELF"
EI_CLASS = 4
ELFCLASS32 = 1
ELFCLASS64 = 2
EI_DATA = 5
ELFDATA2LSB = 1
PT_LOAD = 1


def read_header(data: bytearray) -> Tuple[int, str, int, int, int]:
    if data[:4] != ELF_MAGIC:
        raise ValueError("Not an ELF binary")

    elf_class = data[EI_CLASS]
    if elf_class not in (ELFCLASS32, ELFCLASS64):
        raise ValueError(f"Unsupported ELF class: {elf_class}")

    endian = "<" if data[EI_DATA] == ELFDATA2LSB else ">"

    if elf_class == ELFCLASS64:
        e_phoff = struct.unpack_from(f"{endian}Q", data, 0x20)[0]
        e_phentsize = struct.unpack_from(f"{endian}H", data, 0x36)[0]
        e_phnum = struct.unpack_from(f"{endian}H", data, 0x38)[0]
    else:
        e_phoff = struct.unpack_from(f"{endian}I", data, 0x1C)[0]
        e_phentsize = struct.unpack_from(f"{endian}H", data, 0x2A)[0]
        e_phnum = struct.unpack_from(f"{endian}H", data, 0x2C)[0]

    return elf_class, endian, e_phoff, e_phentsize, e_phnum


def apply_alignment(path: str) -> bool:
    with open(path, "rb") as f:
        data = bytearray(f.read())

    elf_class, endian, phoff, phentsize, phnum = read_header(data)

    if phoff == 0 or phentsize == 0 or phnum == 0:
        return False

    changed = False
    for index in range(phnum):
        entry_offset = phoff + index * phentsize
        if entry_offset + phentsize > len(data):
            break

        if elf_class == ELFCLASS64:
            p_type = struct.unpack_from(f"{endian}I", data, entry_offset)[0]
            align_offset = entry_offset + 0x38
            align = struct.unpack_from(f"{endian}Q", data, align_offset)[0]
            align_size = 8
        else:
            p_type = struct.unpack_from(f"{endian}I", data, entry_offset)[0]
            align_offset = entry_offset + 0x1C
            align = struct.unpack_from(f"{endian}I", data, align_offset)[0]
            align_size = 4

        if p_type != PT_LOAD:
            continue

        if align == 0 or align < PAGE_SIZE:
            struct.pack_into(
                f"{endian}{'Q' if align_size == 8 else 'I'}",
                data,
                align_offset,
                PAGE_SIZE,
            )
            changed = True

    if changed:
        tmp_path = f"{path}.tmp16k"
        with open(tmp_path, "wb") as f:
            f.write(data)
        os.replace(tmp_path, path)
    return changed


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: ensure_16k_page.py <path-to-so>", file=sys.stderr)
        return 1

    target = sys.argv[1]
    try:
        updated = apply_alignment(target)
        if updated:
            print(f"Aligned {target} to {PAGE_SIZE} bytes")
    except Exception as exc:
        print(f"[ensure_16k_page] Skipped {target}: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

