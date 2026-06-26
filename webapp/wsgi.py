import sys
import os

# Add the webapp directory to sys.path
path = '/home/team/shared/webapp'
if path not in sys.path:
    sys.path.insert(0, path)

from app import app as application
