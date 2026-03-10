/**
 * Lightweight HTML-to-Markdown converter using DOMParser.
 * Handles common elements produced by Tiptap/RichTextEditor.
 */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return convertNodes(doc.body.childNodes).trim();
}

function convertNodes(nodes: NodeListOf<ChildNode>): string {
  let result = '';
  for (const node of Array.from(nodes)) {
    result += convertNode(node);
  }
  return result;
}

function convertNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = convertNodes(el.childNodes);

  switch (tag) {
    case 'h1':
      return `# ${inner.trim()}\n\n`;
    case 'h2':
      return `## ${inner.trim()}\n\n`;
    case 'h3':
      return `### ${inner.trim()}\n\n`;
    case 'h4':
      return `#### ${inner.trim()}\n\n`;
    case 'h5':
      return `##### ${inner.trim()}\n\n`;
    case 'h6':
      return `###### ${inner.trim()}\n\n`;

    case 'p':
      return `${inner}\n\n`;

    case 'br':
      return '\n';

    case 'strong':
    case 'b':
      return `**${inner}**`;

    case 'em':
    case 'i':
      return `*${inner}*`;

    case 's':
    case 'strike':
    case 'del':
      return `~~${inner}~~`;

    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return `[${inner}](${href})`;
    }

    case 'code': {
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return inner;
      }
      return `\`${inner}\``;
    }

    case 'pre': {
      const codeContent = convertNodes(el.childNodes);
      return `\`\`\`\n${codeContent.trim()}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const lines = inner.trim().split('\n');
      return lines.map((line) => `> ${line}`).join('\n') + '\n\n';
    }

    case 'ul':
      return convertList(el, 'ul') + '\n';

    case 'ol':
      return convertList(el, 'ol') + '\n';

    case 'li':
      return inner;

    case 'hr':
      return '---\n\n';

    case 'div':
    case 'span':
    case 'section':
    case 'article':
      return inner;

    default:
      return inner;
  }
}

function convertList(el: HTMLElement, type: 'ul' | 'ol'): string {
  const items: string[] = [];
  let index = 1;

  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() !== 'li') continue;

    const liEl = child as HTMLElement;
    const content = convertNodes(liEl.childNodes).trim();
    const checkedAttr = liEl.getAttribute('data-checked');

    if (checkedAttr === 'true') {
      items.push(`- [x] ${content}`);
    } else if (checkedAttr === 'false') {
      items.push(`- [ ] ${content}`);
    } else if (type === 'ol') {
      items.push(`${index}. ${content}`);
      index++;
    } else {
      items.push(`- ${content}`);
    }
  }

  return items.join('\n');
}
