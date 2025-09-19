# Troubleshooting CodeX

This guide helps you resolve common issues with CodeX v1.2.0, including problems with AI models, app sharing, and general functionality.

## Common Issues

### AI Models Not Responding

#### Problem: Model doesn't respond or shows errors

**Possible causes and solutions:**

1. **API Key Issues**

   - **Check API key validity** in Settings → AI Models
   - **Verify API key permissions** with your provider
   - **Test with a different model** to isolate the issue

2. **Network Connectivity**

   - **Check internet connection** - ensure stable connectivity
   - **Try a different network** if possible
   - **Check firewall settings** - ensure CodeX can access the internet

3. **Model Availability**
   - **Try a different model** - some models may be temporarily unavailable
   - **Check provider status** - visit provider status pages
   - **Use free models** as backup options

#### Problem: Responses are slow or timeout

**Solutions:**

- **Reduce thinking budget** to Low for faster responses
- **Use faster models** like Claude 3.5 Haiku or Gemini 2.5 Flash
- **Check your internet speed** - slow connections cause delays
- **Try during off-peak hours** when servers are less busy

#### Problem: Poor response quality

**Solutions:**

- **Increase thinking budget** to High for better reasoning
- **Try a more capable model** like Claude 4 Sonnet or GPT-5
- **Provide more context** in your requests
- **Break complex requests** into smaller, more specific questions

### App Sharing Issues

#### Problem: App won't share or sharing fails

**Possible causes and solutions:**

1. **E2B Service Issues**

   - **Check E2B status** - service may be temporarily unavailable
   - **Try again later** - temporary issues often resolve themselves
   - **Contact support** if issues persist

2. **App Complexity**

   - **Simplify your app** - very complex apps may take longer to share
   - **Check dependencies** - ensure all required packages are included
   - **Test locally first** - make sure your app works in preview

3. **Network Issues**
   - **Check internet connection** - stable connection required for sharing
   - **Try different duration** - some apps need more time to start
   - **Retry the sharing process** - sometimes retrying works

#### Problem: Recipients can't access shared app

**Solutions:**

- **Verify the share link** - ensure it was copied correctly
- **Check sharing duration** - make sure it hasn't expired
- **Test the link yourself** - open it in a different browser
- **Share again** if the link is broken

#### Problem: Shared app runs slowly

**Solutions:**

- **Optimize your app** - remove unnecessary dependencies
- **Check app complexity** - simpler apps share faster
- **Monitor E2B resources** - sandboxes have resource limits
- **Try shorter duration** - 5-minute shares start faster

### Thinking Configuration Issues

#### Problem: Thinking not working or responses too brief

**Solutions:**

- **Check thinking budget setting** - ensure it's not set to "Off"
- **Increase thinking budget** to Medium or High
- **Try a different model** - all models support thinking
- **Provide more context** in your requests

#### Problem: Responses too slow with thinking enabled

**Solutions:**

- **Decrease thinking budget** to Low for faster responses
- **Use faster models** like Haiku or Flash
- **Break complex requests** into smaller parts
- **Use thinking selectively** - only for complex problems

### General Application Issues

#### Problem: CodeX won't start or crashes

**Solutions:**

1. **Restart CodeX** - close and reopen the application
2. **Check system requirements** - ensure your system meets minimum specs
3. **Update CodeX** - download the latest version
4. **Clear cache** - delete temporary files and restart
5. **Reinstall CodeX** - if other solutions don't work

#### Problem: Preview not updating or showing errors

**Solutions:**

- **Refresh the preview** - click the refresh button
- **Check for syntax errors** - fix any code issues
- **Restart the development server** - use the restart command
- **Clear browser cache** - if using web preview

#### Problem: Settings not saving or resetting

**Solutions:**

- **Check file permissions** - ensure CodeX can write to settings files
- **Restart CodeX** - settings may need a restart to take effect
- **Reset settings** - restore to default if corrupted
- **Check for conflicts** - other applications may interfere

## Performance Optimization

### Slow Performance

**Optimization tips:**

- **Close unnecessary applications** - free up system resources
- **Use faster AI models** - Haiku and Flash are faster options
- **Reduce thinking budget** - lower thinking = faster responses
- **Optimize your code** - simpler code runs faster
- **Check system resources** - ensure adequate RAM and CPU

### High Memory Usage

**Solutions:**

- **Restart CodeX periodically** - clears memory leaks
- **Close unused projects** - keep only active projects open
- **Use smaller models** - reduce memory footprint
- **Check for memory leaks** - monitor system resources

### Network Issues

**Optimization:**

- **Use stable internet connection** - avoid unstable WiFi
- **Try different networks** - test with different connections
- **Check firewall settings** - ensure CodeX can access the internet
- **Use offline models** - consider local models for better reliability

## Getting Help

### Before Contacting Support

1. **Check this troubleshooting guide** - many issues are covered here
2. **Try basic solutions** - restart, update, clear cache
3. **Test with different settings** - try different models or configurations
4. **Document the issue** - note what you were doing when the problem occurred

### When to Contact Support

Contact support if you experience:

- **Persistent crashes** that restarting doesn't fix
- **Data loss** or corruption
- **Security concerns** or suspicious behavior
- **Issues not covered** in this troubleshooting guide

### How to Contact Support

- **GitHub Issues**: [Report bugs and issues](https://github.com/iotserver24/codex/issues)
- **Documentation**: Check our comprehensive guides
- **Community**: Join discussions for help from other users

### Information to Include

When reporting issues, include:

- **CodeX version** (v1.2.0)
- **Operating system** and version
- **Steps to reproduce** the problem
- **Error messages** (if any)
- **What you were trying to do** when the issue occurred

## System Requirements

### Minimum Requirements

- **Windows**: Windows 10 or later (x64 or ARM64)
- **macOS**: macOS 10.15 or later (Intel or Apple Silicon)
- **Linux**: Ubuntu 18.04+ or equivalent (x64 or ARM64)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Internet**: Stable connection for AI models

### Recommended Requirements

- **RAM**: 16GB or more
- **Storage**: SSD with 10GB+ free space
- **Internet**: High-speed connection for best performance
- **CPU**: Modern multi-core processor

## Updates and Maintenance

### Keeping CodeX Updated

- **Check for updates** regularly
- **Download latest version** from releases page
- **Backup your projects** before updating
- **Read release notes** for new features and fixes

### Regular Maintenance

- **Clear cache** periodically
- **Restart CodeX** weekly
- **Update dependencies** in your projects
- **Clean up old projects** to save space

---

_Most issues can be resolved with basic troubleshooting steps. If problems persist, don't hesitate to contact support for assistance!_
