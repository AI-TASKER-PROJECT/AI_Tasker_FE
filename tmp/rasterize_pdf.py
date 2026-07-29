from pathlib import Path
import sys
import pypdfium2 as pdfium

pdf_path = Path(sys.argv[1])
out_dir = Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
doc = pdfium.PdfDocument(str(pdf_path))
for index in range(len(doc)):
    image = doc[index].render(scale=1.5).to_pil()
    image.save(out_dir / f"page-{index + 1}.png")
print(len(doc))
